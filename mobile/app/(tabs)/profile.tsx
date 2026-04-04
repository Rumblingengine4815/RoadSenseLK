import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Switch, Alert } from 'react-native';
import { supabase } from '../../lib/supabase';
import { Session } from '@supabase/supabase-js';

export default function ProfileScreen() {
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  async function signInWithEmail() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
    });

    if (error) Alert.alert('Error', error.message);
    else Alert.alert('Check your email', 'We sent you a magic login link!');
    setLoading(false);
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) Alert.alert('Error', error.message);
  }

  if (!session) {
    return (
      <View className="flex-1 bg-background justify-center p-6">
        <Text className="text-3xl text-white font-bold mb-2">RoadSense LK</Text>
        <Text className="text-textSecondary mb-8">Enter your email to receive a magic sign-in link. No password required.</Text>
        
        <TextInput
          className="bg-card text-white py-4 px-4 rounded-xl mb-4"
          placeholder="your.email@example.com"
          placeholderTextColor="#7C7A99"
          value={email}
          onChangeText={setEmail}
          autoCapitalize={'none'}
        />
        
        <TouchableOpacity 
          onPress={signInWithEmail}
          disabled={loading}
          className={`bg-primary py-4 rounded-xl items-center ${loading ? 'opacity-50' : ''}`}
        >
          <Text className="text-white font-bold text-lg">Send Magic Link</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-background px-4 py-8">
      <View className="flex-row justify-between items-center mb-6">
        <Text className="text-white text-3xl font-bold">Dashboard</Text>
        <TouchableOpacity onPress={signOut} className="bg-card px-4 py-2 rounded-full border border-danger">
          <Text className="text-danger font-bold">Sign Out</Text>
        </TouchableOpacity>
      </View>

      <Text className="text-textSecondary mb-6">Logged in as {session.user.email}</Text>

      {/* Stats Summary - Stub data for now */}
      <View className="flex-row justify-between mb-8">
        <View className="bg-card flex-1 p-4 rounded-2xl mr-2 items-center">
          <Text className="text-4xl text-white font-bold">14</Text>
          <Text className="text-textSecondary text-sm uppercase font-bold mt-1">Reports</Text>
        </View>
        <View className="bg-card flex-1 p-4 rounded-2xl ml-2 items-center">
          <Text className="text-4xl text-success font-bold">9</Text>
          <Text className="text-textSecondary text-sm uppercase font-bold mt-1">Verified</Text>
        </View>
      </View>

      <Text className="text-white text-xl font-bold mb-4">Breakdown by Type</Text>
      <View className="bg-card rounded-2xl p-4 mb-8">
        <View className="mb-3">
          <View className="flex-row justify-between mb-1">
            <Text className="text-white">Potholes (8)</Text>
          </View>
          <View className="h-2 w-full bg-background rounded-full overflow-hidden">
            <View className="h-full bg-danger rounded-full" style={{ width: '57%' }} />
          </View>
        </View>
        <View className="mb-3">
          <View className="flex-row justify-between mb-1">
            <Text className="text-white">Cracks (4)</Text>
          </View>
          <View className="h-2 w-full bg-background rounded-full overflow-hidden">
            <View className="h-full bg-accent rounded-full" style={{ width: '28%' }} />
          </View>
        </View>
        <View>
          <View className="flex-row justify-between mb-1">
            <Text className="text-white">Speedbumps (2)</Text>
          </View>
          <View className="h-2 w-full bg-background rounded-full overflow-hidden">
            <View className="h-full bg-primary rounded-full" style={{ width: '15%' }} />
          </View>
        </View>
      </View>

      <Text className="text-white text-xl font-bold mb-4">Settings</Text>
      <View className="bg-card rounded-2xl p-4 mb-8">
        <View className="flex-row justify-between items-center mb-4 border-b border-[rgba(255,255,255,0.05)] pb-4">
          <View>
            <Text className="text-white text-lg">Offline Sync Mode</Text>
            <Text className="text-textSecondary text-sm">Queue reports without 4G</Text>
          </View>
          <Switch 
            value={offlineMode} 
            onValueChange={setOfflineMode}
            trackColor={{ false: '#7C7A99', true: '#7C5CFC' }}
            thumbColor={'#F0EEFF'}
          />
        </View>
      </View>

      <Text className="text-textSecondary text-center mb-10 text-xs">RoadSense LK v1.0.0</Text>
    </ScrollView>
  );
}
