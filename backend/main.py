import os
import io
import uuid
import numpy as np
import onnxruntime as ort
from PIL import Image
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Annotated
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

app = FastAPI(title="RoadSense LK API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Supabase init
S_URL = os.getenv("SUPABASE_URL")
S_KEY = os.getenv("SUPABASE_KEY")

supabase = None
if S_URL and S_KEY:
    try:
        supabase: Client = create_client(S_URL, S_KEY)
    except Exception as e:
        print(f"Supabase Init Error: {e}")

ort_session = None

def get_model():
    global ort_session
    if ort_session is None:
        # Search multiple paths for Cloud vs Local flexibility
        possible_paths = [
            os.path.join(os.path.dirname(__file__), "models/roadsense.onnx"),
            os.path.join(os.path.dirname(__file__), "roadsense.onnx"),
            "/app/models/roadsense.onnx",
            "/app/roadsense.onnx"
        ]
        
        last_err = None
        for path in possible_paths:
            if os.path.exists(path):
                try:
                    ort_session = ort.InferenceSession(path)
                    print(f"Model successfully loaded from: {path}")
                    return ort_session
                except Exception as e:
                    last_err = e
                    print(f"Path exists but load failed at {path}: {e}")
        
        print(f"Model failed to load from all paths. Last error: {last_err}")
    return ort_session

@app.get("/")
@app.get("/healthz")
async def health_check():
    return {"status": "healthy", "service": "RoadSense LK Backend"}

@app.get("/health")
async def diagnostic_health():
    # VERSION 2.0 - PATH FINDER MODE
    # Check Supabase
    try:
        supabase.table("reports").select("id").limit(1).execute()
        db_status = "Online"
    except Exception:
        db_status = "Error (Check Credentials)"
    
    # Path Scanner
    root_dir = os.path.dirname(__file__)
    files_root = os.listdir(root_dir)
    models_path = os.path.join(root_dir, "models")
    files_models = os.listdir(models_path) if os.path.exists(models_path) else ["FOLDER NOT FOUND"]
    
    # Check Model
    model = get_model()
    model_status = "Loaded" if model else "CRITICAL: Model Missing or Corrupt"
    
    return {
        "api_name": "RoadSense LK Master Backend",
        "version": "2.0-Diagnostic-Active",
        "database": db_status,
        "ai_model": model_status,
        "files_in_root": files_root,
        "files_in_models": files_models,
        "absolute_path": root_dir,
    }

@app.post("/api/detect")
async def detect_anomaly(file: UploadFile = File(...)):
    model = get_model()
    if not model:
        # Check files for the error report
        models_exist = os.path.exists(os.path.join(os.path.dirname(__file__), "models/roadsense.onnx"))
        raise HTTPException(status_code=500, detail=f"Model failed to load. Found at path? {models_exist}")
    
    contents = await file.read()
    image = Image.open(io.BytesIO(contents)).convert("RGB")
    image = image.resize((512, 512))
    
    # Preprocess for YOLOv8 (1, 3, 512, 512) normalized to 0-1 float32
    input_data = np.array(image).astype('float32') / 255.0
    input_data = np.transpose(input_data, (2, 0, 1))
    input_data = np.expand_dims(input_data, axis=0)

    # Run ONNX inference
    ort_inputs = {model.get_inputs()[0].name: input_data}
    ort_outs = model.run(None, ort_inputs)
    output = ort_outs[0][0] # Shape: [7, 5376] (cx, cy, w, h, p, s, c)
    
    # Post-processing: YOLOv8 NMS (Master Filter)
    detections = []
    threshold = 0.25 # Professional Demo-ready sensitivity
    
    # Transpose to [5376, 7]
    output = output.T 
    
    # 1. Filter by threshold and gather candidate boxes
    candidates = []
    for row in output:
        scores = row[4:]
        class_id = np.argmax(scores)
        confidence = scores[class_id]
        if confidence > threshold:
            cx, cy, w, h = row[0:4]
            # Convert to [x1, y1, x2, y2]
            x1, y1 = cx - w/2, cy - h/2
            x2, y2 = cx + w/2, cy + h/2
            candidates.append([x1, y1, x2, y2, confidence, class_id])

    # 2. Simple Non-Maximum Suppression (NMS) logic
    if candidates:
        candidates = sorted(candidates, key=lambda x: x[4], reverse=True)
        final_candidates = []
        while candidates:
            best = candidates.pop(0)
            final_candidates.append(best)
            # Remove any other overlapping candidates for the same class
            remaining = []
            for c in candidates:
                # Basic overlap check (Intersection over Union)
                # Area of best and c
                a1 = (best[2]-best[0]) * (best[3]-best[1])
                a2 = (c[2]-c[0]) * (c[3]-c[1])
                # Intersection
                ix = max(0, min(best[2], c[2]) - max(best[0], c[0]))
                iy = max(0, min(best[3], c[3]) - max(best[1], c[1]))
                inter = ix * iy
                iou = inter / (a1 + a2 - inter) if (a1+a2-inter) > 0 else 0
                
                # If they overlap a lot and are the same class, discard the weaker one
                if iou < 0.45 or best[5] != c[5]:
                    remaining.append(c)
            candidates = remaining
        
        # 3. Clean up the coordinates for the dashboard
        labels = ["pothole", "speedbump", "crack"]
        for c in final_candidates:
            x = int(c[0])
            y = int(c[1])
            w = int(c[2] - c[0])
            h = int(c[3] - c[1])
            
            # STREAK GUARD: Ignore boxes that represent garbage (too thin or covering whole top)
            if h < 5 or w < 5: continue # Ignore dots/lines
            if y < 10 and w > 450: continue # Ignore top streaks (Yuv common anomaly)

            detections.append({
                "class": labels[int(c[5])],
                "confidence": float(c[4]),
                "box": [x, y, w, h]
            })

    return {
        "status": "success", 
        "detections": detections[:10], # Return clean results
        "count": len(detections)
    }

@app.post("/api/reports")
async def submit_report(
    type: Annotated[str, Form()],
    severity: Annotated[str, Form()],
    confidence: Annotated[float, Form()],
    lat: Annotated[float, Form()],
    lng: Annotated[float, Form()],
    image: UploadFile = File(...)
):
    try:
        # 1. Upload image to Supabase Storage
        file_ext = image.filename.split('.')[-1]
        file_name = f"{uuid.uuid4()}.{file_ext}"
        contents = await image.read()
        
        # Ensure your Supabase has a public bucket named 'reports'
        supabase.storage.from_("reports").upload(file_name, contents, {"content-type": image.content_type})
        image_url = supabase.storage.from_("reports").get_public_url(file_name)
        
        # 2. Insert into DB with PostGIS location
        # Since standard insertion of PostGIS text is sometimes rejected by Supabase JS wrappers cleanly,
        # we insert using ST_Point via a standard SQL wrapper, but for simplicity here we do text casting
        db_res = supabase.table('reports').insert({
            "anomaly_type": type,
            "severity": severity,
            "confidence": confidence,
            "location": f"POINT({lng} {lat})",
            "image_url": image_url
        }).execute()
        
        return {"status": "success", "image_url": image_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/anomalies/geojson")
async def get_geojson():
    res = supabase.table('reports').select("*").execute()
    features = []
    
    for row in res.data:
        # location usually looks like "POINT(79.86 6.92)"
        loc_str = row.get("location", "")
        if "POINT" in loc_str:
            coords = loc_str.replace("POINT(", "").replace(")", "").split(" ")
            lng, lat = float(coords[0]), float(coords[1])
            
            features.append({
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [lng, lat]
                },
                "properties": {
                    "id": row["id"],
                    "type": row["anomaly_type"],
                    "confidence": row["confidence"],
                    "image": row["image_url"]
                }
            })
            
    return {
        "type": "FeatureCollection",
        "features": features
    }
