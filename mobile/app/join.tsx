import AsyncStorage from '@react-native-async-storage/async-storage';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/auth/AuthContext';
import { PENDING_INVITE_KEY } from '@/invite';
import { useThemeColors } from '@/theme/ThemeContext';

export default function JoinScreen() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const { booting, token, household } = useAuth();
  const colors = useThemeColors();
  const [stored, setStored] = useState(false);

  useEffect(() => {
    const value = (code || '').trim().toUpperCase();
    if (value) {
      AsyncStorage.setItem(PENDING_INVITE_KEY, value).finally(() => setStored(true));
    } else {
      setStored(true);
    }
  }, [code]);

  if (booting || !stored) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  // Not signed in yet → send them through the welcome/auth flow. The code is
  // stashed in AsyncStorage and picked up by wg-setup after they authenticate.
  if (!token) return <Redirect href="/(auth)/welcome" />;

  // Signed in but no household yet → straight to the join/create screen.
  if (!household) return <Redirect href="/(auth)/wg-setup" />;

  // Already in a household → nothing to join, go home.
  return <Redirect href="/(tabs)" />;
}
