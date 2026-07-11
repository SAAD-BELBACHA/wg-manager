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
import { useTranslation } from '@/i18n/I18nContext';
import { spacing } from '@/theme/tokens';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { t } = useTranslation();

  return (
    <Screen>
      <AppHeader title={t('profile.title')} subtitle={t('profile.subtitle')} eyebrow={t('profile.eyebrow')} icon="circle-user" />
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
          <FeatureTile title={t('profile.trust')} subtitle={t('profile.trustSub')} icon="shield-heart" tone="lime" onPress={() => router.push('/trust')} />
          <FeatureTile title={t('profile.notifications')} subtitle={t('profile.notificationsSub')} icon="bell" tone="aqua" onPress={() => router.push('/notifications')} />
          <FeatureTile title={t('profile.settings')} subtitle={t('profile.settingsSub')} icon="gear" tone="primary" onPress={() => router.push('/settings')} />
        </View>
      </Card>
      <Button title={t('profile.logout')} icon="right-from-bracket" variant="secondary" onPress={logout} />
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
