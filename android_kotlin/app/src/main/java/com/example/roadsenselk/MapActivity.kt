package com.example.roadsenselk

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import com.example.roadsenselk.databinding.ActivityMapBinding
import org.osmdroid.config.Configuration
import org.osmdroid.tileprovider.tilesource.TileSourceFactory
import org.osmdroid.util.GeoPoint
import org.osmdroid.views.overlay.Marker

class MapActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMapBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Configuration.getInstance().load(this, getPreferences(MODE_PRIVATE))
        binding = ActivityMapBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.mapView.setTileSource(TileSourceFactory.MAPNIK)
        binding.mapView.setBuiltInZoomControls(true)
        binding.mapView.setMultiTouchControls(true)

        val mapController = binding.mapView.controller
        mapController.setZoom(15.0)
        val startPoint = GeoPoint(6.9271, 79.8612) // Colombo, Sri Lanka
        mapController.setCenter(startPoint)

        binding.btnBack.setOnClickListener {
            finish()
        }

        fetchMarkers()
    }

    private fun fetchMarkers() {
        ApiClient.getAnomalies { jsonString ->
            if (jsonString != null) {
                runOnUiThread {
                    parseAndDisplayMarkers(jsonString)
                }
            }
        }
    }

    private fun parseAndDisplayMarkers(jsonString: String) {
        try {
            val root = org.json.JSONObject(jsonString)
            val features = root.getJSONArray("features")
            for (i in 0 until features.length()) {
                val feature = features.getJSONObject(i)
                val geometry = feature.getJSONObject("geometry")
                val coords = geometry.getJSONArray("coordinates")
                val lng = coords.getDouble(0)
                val lat = coords.getDouble(1)
                
                val props = feature.getJSONObject("properties")
                val type = props.getString("type")
                val conf = props.getDouble("confidence")

                addMarker(lat, lng, "$type (${(conf*100).toInt()}%)")
            }
            binding.mapView.invalidate()
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun addMarker(lat: Double, lng: Double, title: String) {
        val marker = Marker(binding.mapView)
        marker.position = GeoPoint(lat, lng)
        marker.title = title
        marker.setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_BOTTOM)
        binding.mapView.overlays.add(marker)
    }

    override fun onResume() {
        super.onResume()
        binding.mapView.onResume()
    }

    override fun onPause() {
        super.onPause()
        binding.mapView.onPause()
    }
}
