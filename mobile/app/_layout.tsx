import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '@/auth/AuthContext';
import { colors } from '@/theme/tokens';

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" backgroundColor={colors.background} />
      <Stack screenOptions={{ headerShown: false }} />
    </AuthProvider>
  );
}
