package com.example.roadsenselk

import android.content.Context
import android.graphics.*
import org.tensorflow.lite.Interpreter
import org.tensorflow.lite.support.common.FileUtil
import java.nio.ByteBuffer
import java.nio.ByteOrder

class YoloDetector(context: Context) {

    private val interpreter: Interpreter
    private val inputSize = 512
    private val labels = listOf("speedbump", "crack", "pothole")

    init {
        val modelBuffer = FileUtil.loadMappedFile(context, "best_int8.tflite")
        val options = Interpreter.Options()
        interpreter = Interpreter(modelBuffer, options)
    }

    data class Detection(
        val boundingBox: RectF,
        val label: String,
        val confidence: Float
    )

    fun detect(bitmap: Bitmap): List<Detection> {
        val resizedBitmap = Bitmap.createScaledBitmap(bitmap, inputSize, inputSize, true)
        val inputBuffer = convertBitmapToByteBuffer(resizedBitmap)
        // [1, 4 + classes, 5376] -> [1, 7, 5376]
        val outputBuffer = Array(1) { Array(7) { FloatArray(5376) } }

        interpreter.run(inputBuffer, outputBuffer)
        
        return processOutput(outputBuffer[0], bitmap.width, bitmap.height)
    }

    private fun convertBitmapToByteBuffer(bitmap: Bitmap): ByteBuffer {
        // Allocate 4 bytes per pixel for Float32 (1 * 512 * 512 * 3 * 4)
        val byteBuffer = ByteBuffer.allocateDirect(1 * inputSize * inputSize * 3 * 4)
        byteBuffer.order(ByteOrder.nativeOrder())
        val intValues = IntArray(inputSize * inputSize)
        bitmap.getPixels(intValues, 0, bitmap.width, 0, 0, bitmap.width, bitmap.height)
        
        for (pixelValue in intValues) {
            // Normalize RGB values from 0-255 to 0.0-1.0 float
            byteBuffer.putFloat(((pixelValue shr 16) and 0xFF) / 255.0f)
            byteBuffer.putFloat(((pixelValue shr 8) and 0xFF) / 255.0f)
            byteBuffer.putFloat((pixelValue and 0xFF) / 255.0f)
        }
        return byteBuffer
    }

    private fun processOutput(output: Array<FloatArray>, imgWidth: Int, imgHeight: Int): List<Detection> {
        val detections = mutableListOf<Detection>()
        for (i in 0 until 5376) {
            // Find class with highest confidence among indices 4, 5, 6
            var maxConfidence = 0.0f
            var classIndex = -1
            
            for (c in 4 until 7) {
                if (output[c][i] > maxConfidence) {
                    maxConfidence = output[c][i]
                    classIndex = c - 4
                }
            }

            if (maxConfidence > 0.45f && classIndex != -1) {
                val x = output[0][i] * imgWidth / inputSize
                val y = output[1][i] * imgHeight / inputSize
                val w = output[2][i] * imgWidth / inputSize
                val h = output[3][i] * imgHeight / inputSize
                
                detections.add(Detection(
                    RectF(x - w/2, y - h/2, x + w/2, y + h/2),
                    labels[classIndex],
                    maxConfidence
                ))
            }
        }
        return detections
    }
}
