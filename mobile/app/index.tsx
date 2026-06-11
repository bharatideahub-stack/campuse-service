import { Redirect } from 'expo-router';
import { View } from 'react-native';
import { useAuthStore } from '@/store/authStore';

export default function Index() {
  const { isAuthenticated, _hasHydrated } = useAuthStore();

  // Wait for persisted auth state to load before redirecting
  if (!_hasHydrated) return <View style={{ flex: 1, backgroundColor: '#000d3d' }} />;

  return <Redirect href={isAuthenticated ? '/(tabs)/feed' : '/(auth)/login'} />;
}
