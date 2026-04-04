import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import { useQuery } from '@tanstack/react-query';

// Setting accessToken to null is required to use MapLibre properly without Mapbox keys
MapboxGL.setAccessToken(null);

const DEFAULT_CENTER = [80.6337, 7.8731]; // Sri Lanka center

// OpenStreetMap basic free raster tile schema
const styleJSON = JSON.stringify({
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [
    {
      id: 'osm-tiles',
      type: 'raster',
      source: 'osm',
      minzoom: 0,
      maxzoom: 22,
    },
  ],
});

export default function MapScreen() {
  const [selectedFeature, setSelectedFeature] = useState<any>(null);

  // Using React Query to fetch the GeoJSON points from our FastAPI backend
  const { data: geojson, isLoading, refetch } = useQuery({
    queryKey: ['anomalies_geojson'],
    queryFn: async () => {
      // Mocked endpoint behavior while the actual python server awaits deployment
      // Example response from GET /api/anomalies/geojson
      return {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [80.6337, 7.8731] },
            properties: { id: 1, anomalyType: 'Pothole', count: 10, lastReported: '2026-04-03' }
          },
          {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [79.8612, 6.9271] }, // Colombo
            properties: { id: 2, anomalyType: 'Crack', count: 25, lastReported: '2026-04-02' }
          },
          {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [80.2062, 6.0535] }, // Galle
            properties: { id: 3, anomalyType: 'Speedbump', count: 3, lastReported: '2026-04-01' }
          }
        ]
      };
    }
  });

  const onFeaturePress = (e: any) => {
    if (e.features && e.features.length > 0) {
      setSelectedFeature(e.features[0].properties);
    }
  };

  return (
    <View className="flex-1 bg-background relative">
      <MapboxGL.MapView 
        style={StyleSheet.absoluteFill}
        styleJSON={styleJSON}
        logoEnabled={false}
        attributionEnabled={true}
      >
        <MapboxGL.Camera 
          zoomLevel={7} 
          centerCoordinate={DEFAULT_CENTER} 
          animationMode="flyTo"
        />

        {geojson && (
          <MapboxGL.ShapeSource 
            id="anomalies-source" 
            shape={geojson as any}
            onPress={onFeaturePress}
          >
            <MapboxGL.CircleLayer 
              id="anomalies-layer" 
              style={{
                circleRadius: [
                  'interpolate', ['linear'], ['get', 'count'],
                  1, 6,
                  30, 24   // Scale radius based on 'count' value
                ],
                circleColor: [
                  'match',
                  ['get', 'anomalyType'],
                  'Pothole', '#EF4444',
                  'Speedbump', '#3B82F6',
                  'Crack', '#F97316',
                  '#FFFFFF' // default
                ],
                circleOpacity: 0.85,
                circleStrokeWidth: 2,
                circleStrokeColor: '#1E1E30'
              }}
            />
          </MapboxGL.ShapeSource>
        )}
      </MapboxGL.MapView>

      {/* Floating Bottom Sheet Stub */}
      {selectedFeature && (
        <View className="absolute bottom-6 left-4 right-4 bg-card p-6 rounded-3xl shadow-xl flex-col border border-[rgba(255,255,255,0.1)]">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-white text-2xl font-bold uppercase">{selectedFeature.anomalyType}</Text>
            <TouchableOpacity onPress={() => setSelectedFeature(null)} className="p-2">
              <Text className="text-textSecondary">Close</Text>
            </TouchableOpacity>
          </View>
          <Text className="text-textSecondary text-base">Total Reports: <Text className="text-white font-bold">{selectedFeature.count}</Text></Text>
          <Text className="text-textSecondary text-base">Last Identified: <Text className="text-white font-bold">{selectedFeature.lastReported}</Text></Text>
        </View>
      )}

      {/* Manual Refresh Button overlaid on Map */}
      <TouchableOpacity 
        onPress={() => refetch()}
        className="absolute top-12 right-4 bg-primary px-4 py-2 rounded-full shadow-lg"
      >
        <Text className="text-white font-bold">Refresh Map</Text>
      </TouchableOpacity>
    </View>
  );
}
