import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '@/auth/AuthContext';
import { ThemeProvider, useTheme } from '@/theme/ThemeContext';

function ThemedApp() {
  const { resolvedTheme, colors } = useTheme();
  return (
    <AuthProvider>
      <StatusBar style={resolvedTheme === 'dark' ? 'light' : 'dark'} backgroundColor={colors.background} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
    </AuthProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <ThemedApp />
    </ThemeProvider>
  );
}
