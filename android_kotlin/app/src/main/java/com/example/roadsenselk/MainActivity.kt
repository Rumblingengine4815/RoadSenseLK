package com.example.roadsenselk

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.example.roadsenselk.databinding.ActivityMainBinding
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

class MainActivity : AppCompatActivity() {
    private lateinit var binding: ActivityMainBinding
    private lateinit var cameraExecutor: ExecutorService
    private lateinit var detector: YoloDetector

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        android.util.Log.d("RoadSense", "Activity Created")
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        detector = YoloDetector(this)

        if (allPermissionsGranted()) {
            android.util.Log.d("RoadSense", "Permissions already granted")
            startCamera()
        } else {
            android.util.Log.d("RoadSense", "Requesting permissions")
            ActivityCompat.requestPermissions(this, REQUIRED_PERMISSIONS, REQUEST_CODE_PERMISSIONS)
        }

        binding.btnGallery.setOnClickListener {
            val intent = android.content.Intent(this, GalleryActivity::class.java)
            startActivity(intent)
        }

        binding.btnMap.setOnClickListener {
            val intent = android.content.Intent(this, MapActivity::class.java)
            startActivity(intent)
        }

        cameraExecutor = Executors.newSingleThreadExecutor()
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == REQUEST_CODE_PERMISSIONS) {
            if (allPermissionsGranted()) {
                android.util.Log.d("RoadSense", "Permissions granted via popup")
                startCamera()
            } else {
                android.util.Log.e("RoadSense", "Permissions denied by user")
                binding.statusText.text = "Permissions Denied. Please enable in Settings."
            }
        }
    }

    private fun startCamera() {
        android.util.Log.d("RoadSense", "Starting CameraX...")
        val cameraProviderFuture = ProcessCameraProvider.getInstance(this)

        cameraProviderFuture.addListener({
            android.util.Log.d("RoadSense", "Camera Provider Ready")
            val cameraProvider: ProcessCameraProvider = cameraProviderFuture.get()

            val preview = Preview.Builder().build().also {
                it.setSurfaceProvider(binding.viewFinder.surfaceProvider)
            }

            val imageAnalyzer = ImageAnalysis.Builder()
                .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                .build()
                .also {
                    it.setAnalyzer(cameraExecutor, CameraAnalyzer(detector) { detections ->
                        runOnUiThread {
                            binding.overlayView.setDetections(detections)
                            if (detections.isNotEmpty()) {
                                binding.statusText.text = "Detected: ${detections[0].label.uppercase()}"
                                binding.btnReport.visibility = View.VISIBLE
                            } else {
                                binding.statusText.text = "Scanning Road..."
                                binding.btnReport.visibility = View.GONE
                            }
                        }
                    })
                }
            android.util.Log.d("RoadSense", "Binding use cases to Lifecycle")

            val cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA

            try {
                cameraProvider.unbindAll()
                cameraProvider.bindToLifecycle(this, cameraSelector, preview, imageAnalyzer)
            } catch (exc: Exception) {
                Toast.makeText(this, "Failed to bind camera: ${exc.message}", Toast.LENGTH_SHORT).show()
            }
        }, ContextCompat.getMainExecutor(this))
    }

    private fun allPermissionsGranted() = REQUIRED_PERMISSIONS.all {
        ContextCompat.checkSelfPermission(baseContext, it) == PackageManager.PERMISSION_GRANTED
    }



    override fun onDestroy() {
        super.onDestroy()
        cameraExecutor.shutdown()
    }

    companion object {
        private const val REQUEST_CODE_PERMISSIONS = 10
        private val REQUIRED_PERMISSIONS = mutableListOf(
            Manifest.permission.CAMERA,
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION
        ).apply {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                add("android.permission.READ_MEDIA_IMAGES")
            } else {
                add(Manifest.permission.READ_EXTERNAL_STORAGE)
            }
        }.toTypedArray()
    }
}