import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

export default function ReportScreen() {
  const router = useRouter();
  
  const [type, setType] = useState('Pothole');
  const [severity, setSeverity] = useState('Medium');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Sorry, we need camera permissions to make this work!');
      return;
    }

    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!imageUri) {
      Alert.alert('Missing Image', 'Please take a photo of the anomaly first.');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // 1. Get Location
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need location permissions to map the anomaly!');
        setIsSubmitting(false);
        return;
      }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });

      // 2. Prepare FormData
      const formData = new FormData();
      const filename = imageUri.split('/').pop() || 'upload.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const typeStr = match ? `image/${match[1]}` : `image/jpeg`;

      formData.append('image', { uri: imageUri, name: filename, type: typeStr } as any);
      formData.append('type', type);
      formData.append('severity', severity);
      formData.append('confidence', '1.0'); // Base user confidence
      formData.append('notes', notes);
      formData.append('lat', String(location.coords.latitude));
      formData.append('lng', String(location.coords.longitude));
      
      // Target backend URL (Change YOUR_LOCAL_IP to your actual dev machine IP for device testing)
      const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.100:8000';
      
      const response = await fetch(`${API_URL}/api/reports`, { 
        method: 'POST', 
        body: formData,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'multipart/form-data',
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload report to server.');
      }
      
      Alert.alert('Success', 'Report saved effectively to the backend!');
      setImageUri(null); // Reset
      setNotes('');
      router.push('/map');
      
    } catch (e: any) {
      console.error(e);
      Alert.alert('Error', e.message || 'Could not upload. Is the python backend running?');
    } finally {
      setIsSubmitting(false);
    }
  };

  const types = ['Pothole', 'Speedbump', 'Crack', 'Other'];
  const severities = ['Low', 'Medium', 'High'];

  return (
    <ScrollView className="flex-1 bg-background px-4 py-8">
      <Text className="text-3xl font-bold text-white mb-6">File a Report</Text>

      {/* Image Capture Area */}
      <View className="h-56 bg-card rounded-2xl justify-center items-center mb-6 overflow-hidden border border-[rgba(255,255,255,0.05)]">
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={{ width: '100%', height: '100%' }} />
        ) : (
          <View className="items-center">
            <Text className="text-textSecondary mb-4">No Image Selected</Text>
            <View className="flex-row">
              <TouchableOpacity onPress={takePhoto} className="bg-primary px-4 py-2 rounded-lg mr-2">
                <Text className="text-white font-bold">Open Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={pickImage} className="bg-background px-4 py-2 rounded-lg border border-primary">
                <Text className="text-primary font-bold">Gallery</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
      
      {/* If Image exists, allow retaking */}
      {imageUri && (
        <TouchableOpacity onPress={() => setImageUri(null)} className="mb-6 self-end">
          <Text className="text-danger font-bold">Remove Image</Text>
        </TouchableOpacity>
      )}

      <Text className="text-textSecondary mb-2 font-bold uppercase tracking-wider text-xs">Anomaly Type</Text>
      <View className="flex-row flex-wrap mb-6">
        {types.map((t) => (
          <TouchableOpacity 
            key={t}
            onPress={() => setType(t)}
            className={`px-4 py-2 rounded-full mr-2 mb-2 ${type === t ? 'bg-primary' : 'bg-card border border-[rgba(255,255,255,0.05)]'}`}
          >
            <Text className="text-white">{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text className="text-textSecondary mb-2 font-bold uppercase tracking-wider text-xs">Assessed Severity</Text>
      <View className="flex-row mb-6">
        {severities.map((s) => (
          <TouchableOpacity 
            key={s}
            onPress={() => setSeverity(s)}
            className={`flex-1 items-center py-3 rounded-lg mx-1 ${severity === s ? 'bg-accent' : 'bg-card border border-[rgba(255,255,255,0.05)]'}`}
          >
            <Text className="text-white font-bold">{s}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text className="text-textSecondary mb-2 font-bold uppercase tracking-wider text-xs">Additional Notes</Text>
      <TextInput
        className="bg-card text-white py-4 px-4 rounded-xl mb-8 border border-[rgba(255,255,255,0.05)]"
        placeholder="E.g., Very deep hole on inner lane"
        placeholderTextColor="#7C7A99"
        value={notes}
        onChangeText={setNotes}
      />

      <TouchableOpacity 
        onPress={handleSubmit}
        disabled={isSubmitting}
        className={`bg-primary py-4 rounded-xl items-center shadow-lg mb-12 flex-row justify-center ${isSubmitting ? 'opacity-50' : ''}`}
      >
        {isSubmitting && <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />}
        <Text className="text-white font-bold text-lg">
          {isSubmitting ? 'Uploading to Server...' : 'Submit Report'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
