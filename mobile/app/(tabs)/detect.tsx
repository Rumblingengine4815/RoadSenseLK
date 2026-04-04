import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { Camera, useCameraDevice, useFrameProcessor } from 'react-native-vision-camera';
import { BoundingBoxOverlay, Detection } from '../../components/BoundingBoxOverlay';
import { useTFLite } from '../../hooks/useTFLite';
import { useRouter } from 'expo-router';

export default function DetectScreen() {
  const device = useCameraDevice('back');
  const [hasPermission, setHasPermission] = useState(false);
  const { model } = useTFLite();
  const router = useRouter();
  
  const [detections, setDetections] = useState<Detection[]>([]);
  const { width, height } = Dimensions.get('window');

  useEffect(() => {
    (async () => {
      const status = await Camera.requestCameraPermission();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    if (!model) return;
    
    // TODO: implement tensor resizing + NMS logic inside worklet
    // then call runOnJS(setDetections)(parsedBoxes);
  }, [model]);

  if (!hasPermission) return <View className="flex-1 items-center justify-center bg-background"><Text className="text-white">No camera permission</Text></View>;
  if (!device) return <View className="flex-1 items-center justify-center bg-background"><Text className="text-white">No camera device</Text></View>;

  return (
    <View className="flex-1 bg-background">
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        frameProcessor={frameProcessor}
      />
      
      <BoundingBoxOverlay 
        detections={detections}
        imageWidth={512}  // Model input scale
        imageHeight={512}
        viewWidth={width}
        viewHeight={height}
      />

      <View className="absolute bottom-10 self-center">
        <TouchableOpacity 
          className="bg-primary px-6 py-4 rounded-full shadow-lg"
          onPress={() => router.push('/report')}
        >
          <Text className="text-white font-bold text-lg">Report This</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
