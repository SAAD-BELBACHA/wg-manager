import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { apiRequest } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { useTranslation } from '@/i18n/I18nContext';
import { AppHeader } from '@/components/AppHeader';
import { AppText } from '@/components/AppText';
import { AvatarGroup } from '@/components/AvatarGroup';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { FeatureTile } from '@/components/FeatureTile';
import { MemberAvatar } from '@/components/MemberAvatar';
import { Screen } from '@/components/Screen';
import { StatusPill } from '@/components/StatusPill';
import { HouseholdInfoResponse, User } from '@/types/api';
import { spacing } from '@/theme/tokens';
import { useThemeColors } from '@/theme/ThemeContext';

export default function WgScreen() {
  const { token, household } = useAuth();
  const colors = useThemeColors();
  const { t } = useTranslation();
  const styles = useMemo(() => StyleSheet.create({
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
  }), [colors]);
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
      .catch(err => alive && setError(err instanceof Error ? err.message : t('wg.loadError')))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [token]));

  return (
    <Screen>
      <AppHeader title={t('wg.title')} subtitle={t('wg.subtitle')} eyebrow={t('wg.eyebrow')} icon="people-roof" />

      <Card tone="aqua">
        <View style={styles.wgTop}>
          <View style={styles.wgCopy}>
            <StatusPill label={t('wg.currentWg')} tone="primary" />
            <AppText variant="h2">{household?.name}</AppText>
            <AppText variant="muted">{t('wg.code', { code: household?.invite_code || '' })}</AppText>
          </View>
          {members.length ? <AvatarGroup members={members} /> : null}
        </View>
        <Button title={t('wg.inviteButton')} icon="user-plus" onPress={() => router.push('/invite')} />
      </Card>

      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      {error ? <AppText variant="small" style={styles.error}>{error}</AppText> : null}

      {!loading && members.length <= 1 ? (
        <Card tone="lime">
          <AppText variant="h2">{t('wg.aloneTitle')}</AppText>
          <AppText variant="muted">
            {t('wg.aloneBody')}
          </AppText>
          <Button title={t('wg.aloneCta')} icon="paper-plane" onPress={() => router.push('/invite')} />
        </Card>
      ) : null}

      <Card>
        <AppText variant="h2">{t('wg.members')}</AppText>
        {members.length ? members.map(member => (
          <View key={member.id} style={styles.memberRow}>
            <MemberAvatar user={member} />
            <View style={{ flex: 1 }}>
              <AppText>{member.username}</AppText>
              <AppText variant="small" style={{ color: colors.textMuted }}>{member.email}</AppText>
            </View>
          </View>
        )) : <AppText variant="muted">{t('wg.noMembers')}</AppText>}
      </Card>

      <Card>
        <AppText variant="h2">{t('wg.areas')}</AppText>
        <View style={styles.featureGrid}>
          <FeatureTile title={t('wg.calendar')} subtitle={t('wg.calendarSub')} icon="calendar-days" tone="aqua" onPress={() => router.push('/calendar')} />
          <FeatureTile title={t('wg.rules')} subtitle={t('wg.rulesSub')} icon="book" tone="lime" onPress={() => router.push('/rules')} />
          <FeatureTile title={t('wg.polls')} subtitle={t('wg.pollsSub')} icon="square-poll-vertical" tone="primary" onPress={() => router.push('/polls')} />
          <FeatureTile title={t('wg.mood')} subtitle={t('wg.moodSub')} icon="face-smile" tone="coral" onPress={() => router.push('/mood')} />
          <FeatureTile title={t('wg.conflicts')} subtitle={t('wg.conflictsSub')} icon="comments" tone="aqua" onPress={() => router.push('/conflicts')} />
          <FeatureTile title={t('wg.scan')} subtitle={t('wg.scanSub')} icon="camera" tone="lime" onPress={() => router.push('/receipt-scan')} />
          <FeatureTile title={t('wg.checklists')} subtitle={t('wg.checklistsSub')} icon="box-archive" tone="primary" onPress={() => router.push('/checklists')} />
        </View>
      </Card>
    </Screen>
  );
}
