import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { apiRequest } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { AppHeader } from '@/components/AppHeader';
import { AppText } from '@/components/AppText';
import { AvatarGroup } from '@/components/AvatarGroup';
import { Card } from '@/components/Card';
import { FeatureTile } from '@/components/FeatureTile';
import { MemberAvatar } from '@/components/MemberAvatar';
import { Screen } from '@/components/Screen';
import { StatusPill } from '@/components/StatusPill';
import { HouseholdInfoResponse, User } from '@/types/api';
import { colors, spacing } from '@/theme/tokens';

export default function WgScreen() {
  const { token, household } = useAuth();
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useFocusEffect(useCallback(() => {
    let alive = true;
    if (!token) {
      setLoading(false);
      return () => { alive = false; };
    }
    setLoading(true);
    setError('');
    apiRequest<HouseholdInfoResponse>('/wg/info', { token })
      .then(data => alive && setMembers(data.members))
      .catch(err => alive && setError(err instanceof Error ? err.message : 'WG konnte nicht geladen werden.'))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [token]));

  return (
    <Screen>
      <AppHeader title="WG" subtitle="Mitglieder, Regeln, Stimmung und Entscheidungen." eyebrow="Home" icon="people-roof" />

      <Card tone="aqua">
        <View style={styles.wgTop}>
          <View style={styles.wgCopy}>
            <StatusPill label="Aktuelle WG" tone="primary" />
            <AppText variant="h2">{household?.name}</AppText>
            <AppText variant="muted">Code: {household?.invite_code}</AppText>
          </View>
          {members.length ? <AvatarGroup members={members} /> : null}
        </View>
      </Card>

      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      {error ? <AppText variant="small" style={styles.error}>{error}</AppText> : null}

      <Card>
        <AppText variant="h2">Mitglieder</AppText>
        {members.length ? members.map(member => (
          <View key={member.id} style={styles.memberRow}>
            <MemberAvatar user={member} />
            <View style={{ flex: 1 }}>
              <AppText>{member.username}</AppText>
              <AppText variant="small" style={{ color: colors.textMuted }}>{member.email}</AppText>
            </View>
          </View>
        )) : <AppText variant="muted">Noch keine Mitglieder geladen.</AppText>}
      </Card>

      <Card>
        <AppText variant="h2">WG-Bereiche</AppText>
        <View style={styles.featureGrid}>
          <FeatureTile title="Kalender" subtitle="Termine und Abwesenheit" icon="calendar-days" tone="aqua" onPress={() => router.push('/calendar')} />
          <FeatureTile title="Regeln" subtitle="Hausregeln und Vorschläge" icon="book" tone="lime" onPress={() => router.push('/rules')} />
          <FeatureTile title="Abstimmungen" subtitle="Entscheidungen fair treffen" icon="square-poll-vertical" tone="primary" onPress={() => router.push('/polls')} />
          <FeatureTile title="Stimmung" subtitle="Wöchentlicher Check-in" icon="face-smile" tone="coral" onPress={() => router.push('/mood')} />
          <FeatureTile title="Konflikte" subtitle="Sachlich klären" icon="comments" tone="aqua" onPress={() => router.push('/conflicts')} />
          <FeatureTile title="Scan" subtitle="Kassenzettel Workflow" icon="camera" tone="lime" onPress={() => router.push('/receipt-scan')} />
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wgTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md
  },
  wgCopy: {
    flex: 1,
    gap: spacing.sm
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  error: {
    color: colors.danger
  },
  featureGrid: {
    gap: spacing.md,
    marginTop: spacing.md
  }
});
