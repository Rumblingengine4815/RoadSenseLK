package com.example.roadsenselk

import android.app.Activity
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.ImageDecoder
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.MediaStore
import android.view.View
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import com.example.roadsenselk.databinding.ActivityGalleryBinding

class GalleryActivity : AppCompatActivity() {

    private lateinit var binding: ActivityGalleryBinding
    private lateinit var detector: YoloDetector

    private val pickImageLauncher = registerForActivityResult(ActivityResultContracts.GetContent()) { uri: Uri? ->
        uri?.let { processImage(it) }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityGalleryBinding.inflate(layoutInflater)
        setContentView(binding.root)

        detector = YoloDetector(this)

        binding.btnPick.setOnClickListener {
            pickImageLauncher.launch("image/*")
        }

        binding.btnBack.setOnClickListener {
            finish()
        }
    }

    private fun processImage(uri: Uri) {
        android.util.Log.d("RoadSense", "Selected Gallery Image: $uri")
        try {
            val bitmap = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                val source = ImageDecoder.createSource(contentResolver, uri)
                ImageDecoder.decodeBitmap(source) { decoder, _, _ ->
                    decoder.isMutableRequired = true
                    decoder.allocator = ImageDecoder.ALLOCATOR_SOFTWARE // CRITICAL: Avoid hardware bitmap crash
                }
            } else {
                MediaStore.Images.Media.getBitmap(contentResolver, uri).copy(Bitmap.Config.ARGB_8888, true)
            }

            android.util.Log.d("RoadSense", "Bitmap Decoded Successfully: ${bitmap.width}x${bitmap.height}")
            binding.imageView.setImageBitmap(bitmap)
            binding.statusText.text = "Analyzing..."

            try {
                val detections = detector.detect(bitmap)
                android.util.Log.d("RoadSense", "Analysis Complete. Detections: ${detections.size}")
                binding.overlayView.setDetections(detections)

                if (detections.isNotEmpty()) {
                    binding.statusText.text = "Detected: ${detections[0].label.uppercase()}"
                    binding.btnReport.visibility = View.VISIBLE
                    
                    binding.btnReport.setOnClickListener {
                        reportFromGallery(bitmap, detections[0].confidence)
                    }
                } else {
                    binding.statusText.text = "No anomalies found."
                    binding.btnReport.visibility = View.GONE
                }
            } catch (e: Exception) {
                android.util.Log.e("RoadSense", "AI Analysis Error: ${e.message}")
                Toast.makeText(this, "AI Analysis Error: ${e.message}", Toast.LENGTH_LONG).show()
                binding.statusText.text = "Analysis Failed"
            }

        } catch (e: Exception) {
            android.util.Log.e("RoadSense", "Image Loading Error: ${e.message}")
            Toast.makeText(this, "Failed to load image: ${e.message}", Toast.LENGTH_SHORT).show()
        }
    }

    private fun reportFromGallery(bitmap: Bitmap, confidence: Float) {
        val file = java.io.File(cacheDir, "gallery_report.jpg")
        val out = java.io.FileOutputStream(file)
        bitmap.compress(Bitmap.CompressFormat.JPEG, 90, out)
        out.flush()
        out.close()

        binding.btnReport.isEnabled = false
        binding.statusText.text = "Reporting to backend..."

        ApiClient.reportAnomaly(file, 6.9271, 79.8612, confidence) { success, error ->
            runOnUiThread {
                binding.btnReport.isEnabled = true
                if (success) {
                    Toast.makeText(this, "Success! Check the Map.", Toast.LENGTH_SHORT).show()
                    binding.statusText.text = "Reported Successfully!"
                } else {
                    Toast.makeText(this, "Upload failed: $error", Toast.LENGTH_SHORT).show()
                    binding.statusText.text = "Error: $error"
                }
            }
        }
    }
}
