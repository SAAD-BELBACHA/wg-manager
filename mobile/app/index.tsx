import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/auth/AuthContext';
import { colors } from '@/theme/tokens';

export default function Index() {
  const { booting, token, household } = useAuth();

  if (booting) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!token) return <Redirect href="/(auth)/welcome" />;
  if (!household) return <Redirect href="/(auth)/wg-setup" />;
  return <Redirect href="/(tabs)" />;
}
