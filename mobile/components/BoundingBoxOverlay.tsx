import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export interface Detection {
  classIndex: number;
  confidence: number;
  rect: { x: number; y: number; w: number; h: number };
}

const CLASS_COLORS = {
  0: '#EF4444', // Pothole - Red
  1: '#3B82F6', // Speedbump - Blue
  2: '#F97316', // Crack - Orange
};

const CLASS_NAMES = {
  0: 'Pothole',
  1: 'Speedbump',
  2: 'Crack',
};

interface Props {
  detections: Detection[];
  imageWidth: number;
  imageHeight: number;
  viewWidth: number;
  viewHeight: number;
}

export function BoundingBoxOverlay({ detections, imageWidth, imageHeight, viewWidth, viewHeight }: Props) {
  const scaleX = viewWidth / imageWidth;
  const scaleY = viewHeight / imageHeight;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {detections.map((det, index) => {
        const color = CLASS_COLORS[det.classIndex as keyof typeof CLASS_COLORS] || 'white';
        const name = CLASS_NAMES[det.classIndex as keyof typeof CLASS_NAMES] || 'Unknown';
        
        // Scale TFLite coordinates (which are 0-512) up to the screen size
        const left = det.rect.x * scaleX;
        const top = det.rect.y * scaleY;
        const width = det.rect.w * scaleX;
        const height = det.rect.h * scaleY;

        return (
          <View
            key={`box-${index}`}
            style={{
              position: 'absolute',
              left,
              top,
              width,
              height,
              borderWidth: 2,
              borderColor: color,
              borderRadius: 4,
            }}
          >
            <View style={{ backgroundColor: color, alignSelf: 'flex-start', paddingHorizontal: 4, paddingVertical: 2, borderRadius: 2 }}>
              <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>
                {`${name} ${(det.confidence * 100).toFixed(1)}%`}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}
