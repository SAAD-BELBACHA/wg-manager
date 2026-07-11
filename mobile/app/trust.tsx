import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { apiRequest } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { AppHeader } from '@/components/AppHeader';
import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ListRow } from '@/components/ListRow';
import { MetricCard } from '@/components/MetricCard';
import { Screen } from '@/components/Screen';
import { StatusPill } from '@/components/StatusPill';
import { TrustProfile } from '@/types/api';
import { radii, spacing } from '@/theme/tokens';
import { useThemeColors } from '@/theme/ThemeContext';

export default function TrustScreen() {
  const { token } = useAuth();
  const colors = useThemeColors();
  const styles = useMemo(() => StyleSheet.create({
    scoreCard: { alignItems: 'center', gap: spacing.md },
    scoreCircle: {
      width: 150,
      height: 150,
      borderRadius: radii.pill,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center'
    },
    metrics: { flexDirection: 'row', gap: spacing.md }
  }), [colors]);
  const [profile, setProfile] = useState<TrustProfile | null>(null);
  const [loading, setLoading] = useState(false);

  useFocusEffect(useCallback(() => {
    if (!token) return;
    setLoading(true);
    apiRequest<TrustProfile>('/trust-profile', { token })
      .then(setProfile)
      .finally(() => setLoading(false));
  }, [token]));

  return (
    <Screen>
      <AppHeader title="Vertrauen" subtitle="Privates Profil für Zuverlässigkeit und faire Beiträge." eyebrow="Private" icon="shield-heart" back />
      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      {profile ? (
        <>
          <Card style={styles.scoreCard}>
            <View style={styles.scoreCircle}>
              <AppText variant="title">{profile.score ?? '-'}</AppText>
              <AppText variant="small">/ {profile.max_score}</AppText>
            </View>
            <StatusPill label={profile.level} tone="lime" />
            {!profile.enough_data ? (
              <AppText variant="muted">Noch nicht genügend verifizierte Aktivitäten.</AppText>
            ) : null}
          </Card>
          <View style={styles.metrics}>
            <MetricCard label="Aufgaben" value={String(profile.task_reliability)} icon="list-check" tone="aqua" />
            <MetricCard label="Ausgaben" value={String(profile.payment_reliability)} icon="wallet" tone="lime" />
          </View>
          <Card>
            <AppText variant="h2">Ereignisse</AppText>
            {profile.events.length ? profile.events.map(event => (
              <ListRow
                key={event.id}
                title={event.explanation || event.event_type}
                subtitle={`${event.points} Punkte`}
                icon="star"
              />
            )) : <EmptyState title="Noch keine Events" body="Verifizierte Aktivitäten erscheinen hier." icon="star" tone="aqua" />}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}
