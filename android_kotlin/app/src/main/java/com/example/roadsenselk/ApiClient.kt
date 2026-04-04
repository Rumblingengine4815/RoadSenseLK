package com.example.roadsenselk

import okhttp3.*
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.RequestBody.Companion.asRequestBody
import java.io.File
import java.io.IOException

object ApiClient {
    private val client = OkHttpClient()
    
    // Smart URL Switch: 10.0.2.2 for PC Emulator, Physical IP for S24 Ultra
    private val BASE_URL = if (android.os.Build.PRODUCT.contains("sdk") || 
                              android.os.Build.MODEL.contains("Emulator")) {
        "http://10.0.2.2:8000"
    } else {
        "http://192.168.8.180:8000"
    }

    fun reportAnomaly(
        imageFile: File,
        lat: Double,
        lng: Double,
        confidence: Float,
        callback: (Boolean, String?) -> Unit
    ) {
        val requestBody = MultipartBody.Builder()
            .setType(MultipartBody.FORM)
            .addFormDataPart("lat", lat.toString())
            .addFormDataPart("lng", lng.toString())
            .addFormDataPart("confidence", confidence.toString())
            .addFormDataPart(
                "file", "anomaly.jpg",
                imageFile.asRequestBody("image/jpeg".toMediaTypeOrNull())
            )
            .build()

        val request = Request.Builder()
            .url("$BASE_URL/api/anomalies/report")
            .post(requestBody)
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                callback(false, e.message)
            }

            override fun onResponse(call: Call, response: Response) {
                callback(response.isSuccessful, if (response.isSuccessful) null else "Server Error")
            }
        })
    }

    fun getAnomalies(callback: (String?) -> Unit) {
        val request = Request.Builder()
            .url("$BASE_URL/api/anomalies/geojson")
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                callback(null)
            }

            override fun onResponse(call: Call, response: Response) {
                callback(if (response.isSuccessful) response.body?.string() else null)
            }
        })
    }
}
