import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/auth/AuthContext';
import { hasSeenOnboarding } from '@/onboarding';
import { useThemeColors } from '@/theme/ThemeContext';

export default function Index() {
  const { booting, token, household } = useAuth();
  const colors = useThemeColors();
  const [onboardingSeen, setOnboardingSeen] = useState<boolean | null>(null);

  useEffect(() => {
    hasSeenOnboarding().then(setOnboardingSeen);
  }, []);

  if (booting || onboardingSeen === null) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!token) {
    // First-time visitors see the short "how it works" intro before the welcome screen.
    return <Redirect href={onboardingSeen ? '/(auth)/welcome' : '/(auth)/onboarding'} />;
  }
  if (!household) return <Redirect href="/(auth)/wg-setup" />;
  return <Redirect href="/(tabs)" />;
}
