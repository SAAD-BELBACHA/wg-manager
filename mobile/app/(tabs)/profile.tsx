import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { AppHeader } from '@/components/AppHeader';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { FeatureTile } from '@/components/FeatureTile';
import { MemberAvatar } from '@/components/MemberAvatar';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/auth/AuthContext';
import { spacing } from '@/theme/tokens';

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  return (
    <Screen>
      <AppHeader title="Profil" subtitle="Konto, Vertrauen, Meldungen und Einstellungen." eyebrow="Du" icon="circle-user" />
      <Card tone="aqua">
        <View style={styles.profileRow}>
          {user ? <MemberAvatar user={user} size={64} /> : null}
          <View style={{ flex: 1 }}>
            <AppText variant="h2">{user?.username}</AppText>
            <AppText variant="muted">{user?.email}</AppText>
          </View>
        </View>
      </Card>
      <Card>
        <View style={styles.linkList}>
          <FeatureTile title="Vertrauensprofil" subtitle="Private Zuverlässigkeit" icon="shield-heart" tone="lime" onPress={() => router.push('/trust')} />
          <FeatureTile title="Benachrichtigungen" subtitle="In-App Meldungen" icon="bell" tone="aqua" onPress={() => router.push('/notifications')} />
          <FeatureTile title="Einstellungen" subtitle="Sprache, Datenschutz, Hilfe" icon="gear" tone="primary" onPress={() => router.push('/settings')} />
        </View>
      </Card>
      <Button title="Abmelden" icon="right-from-bracket" variant="secondary" onPress={logout} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md
  },
  linkList: {
    gap: spacing.md
  }
});
