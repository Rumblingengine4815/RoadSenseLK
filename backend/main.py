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
supabase: Client = create_client(S_URL, S_KEY)

ort_session = None

def get_model():
    global ort_session
    if ort_session is None:
        model_path = os.path.join(os.path.dirname(__file__), "../models/roadsense.onnx")
        try:
            ort_session = ort.InferenceSession(model_path)
        except Exception as e:
            print("Failed to load model:", e)
    return ort_session

@app.get("/")
@app.get("/healthz")
async def health_check():
    return {"status": "healthy", "service": "RoadSense LK Backend"}

@app.post("/api/detect")
async def detect_anomaly(file: UploadFile = File(...)):
    model = get_model()
    if not model:
        raise HTTPException(status_code=500, detail="Model failed to load")
    
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
    output = ort_outs[0]
    
    return {
        "status": "success", 
        "raw_shape": output.shape,
        "message": "Inference complete. NMS parsing left to frontend/client."
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

@app.get("/health")
async def health_check():
    # Check Supabase
    try:
        supabase.table("reports").select("id").limit(1).execute()
        db_status = "Online"
    except Exception:
        db_status = "Error (Check Credentials)"
    
    # Check Model
    model = get_model()
    model_status = "Loaded" if model else "Failed"
    
    return {
        "status": "RoadSense API is Operational",
        "database": db_status,
        "ai_model": model_status,
        "version": "1.0.0-CloudReady"
    }

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
