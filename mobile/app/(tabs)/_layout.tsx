import { Tabs } from 'expo-router';
import { Camera, Map, Upload, User } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ 
      tabBarActiveTintColor: '#7C5CFC', 
      tabBarStyle: { backgroundColor: '#1E1E30', borderTopColor: '#0D0D14' },
      headerStyle: { backgroundColor: '#1E1E30' },
      headerTintColor: '#F0EEFF'
    }}>
      <Tabs.Screen
        name="detect"
        options={{
          title: 'Detect',
          tabBarIcon: ({ color }) => <Camera color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          tabBarIcon: ({ color }) => <Map color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: 'Report',
          tabBarIcon: ({ color }) => <Upload color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <User color={color} size={24} />,
        }}
      />
    </Tabs>
  );
}
