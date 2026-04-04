import { useState, useEffect } from 'react';
import { useTensorflowModel } from 'react-native-fast-tflite';

// We'll require the TFLite model from the assets directory once it's created.
// Update: Expo uses dynamic require correctly with fast-tflite if bundle is built,
// or we can load it from bundle. For now we prepare the hook.

export function useTFLite() {
  // Load the INT8 quantized YOLO model from assets
  const model = useTensorflowModel(require('../assets/best_int8.tflite'));

  return {
    model: model.model,
    state: model.state,
  };
}
