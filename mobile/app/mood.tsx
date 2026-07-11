import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { apiRequest } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { useTranslation } from '@/i18n/I18nContext';
import { AppHeader } from '@/components/AppHeader';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { MetricCard } from '@/components/MetricCard';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { MoodSummary } from '@/types/api';
import { radii, spacing } from '@/theme/tokens';
import { useThemeColors } from '@/theme/ThemeContext';

const RATING_FIELDS: { key: 'wellbeing' | 'fairness' | 'cleanliness' | 'communication'; labelKey: string }[] = [
  { key: 'wellbeing', labelKey: 'mood.wellbeing' },
  { key: 'fairness', labelKey: 'mood.fairness' },
  { key: 'cleanliness', labelKey: 'mood.cleanliness' },
  { key: 'communication', labelKey: 'mood.communication' }
];

export default function MoodScreen() {
  const { token } = useAuth();
  const colors = useThemeColors();
  const { t } = useTranslation();
  const styles = useMemo(() => StyleSheet.create({
    form: { gap: spacing.md },
    metrics: { gap: spacing.md }
  }), [colors]);
  const [summary, setSummary] = useState<MoodSummary | null>(null);
  const [ratings, setRatings] = useState({ wellbeing: 3, fairness: 3, cleanliness: 3, communication: 3 });
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    if (!token) return;
    setLoading(true);
    apiRequest<{ summary: MoodSummary }>('/mood-checks', { token })
      .then(data => setSummary(data.summary))
      .finally(() => setLoading(false));
  }, [token]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function submitMood() {
    await apiRequest<{ success: boolean }>('/mood-checks', {
      method: 'POST',
      token,
      body: { ...ratings, comment, anonymous: true }
    });
    setComment('');
    setRatings({ wellbeing: 3, fairness: 3, cleanliness: 3, communication: 3 });
    load();
  }

  return (
    <Screen>
      <AppHeader title={t('mood.title')} subtitle={t('mood.subtitle')} eyebrow={t('mood.eyebrow')} icon="face-smile" back />
      <Card tone="coral">
        <AppText variant="muted">
          {t('mood.disclaimer')}
        </AppText>
      </Card>
      <Card tone="soft">
        <View style={styles.form}>
          {RATING_FIELDS.map(field => (
            <RatingSelector
              key={field.key}
              label={t(field.labelKey)}
              value={ratings[field.key]}
              onChange={v => setRatings(current => ({ ...current, [field.key]: v }))}
            />
          ))}
          <TextField label={t('mood.comment')} value={comment} onChangeText={setComment} placeholder={t('mood.commentPlaceholder')} />
          <Button title={t('mood.submit')} icon="paper-plane" onPress={submitMood} />
        </View>
      </Card>
      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      <Card>
        <AppText variant="h2">{t('mood.wgMood')}</AppText>
        {summary?.visible ? (
          <View style={styles.metrics}>
            <Metric label={t('mood.wellbeing')} value={summary.wellbeing} />
            <Metric label={t('mood.fairness')} value={summary.fairness} />
            <Metric label={t('mood.cleanliness')} value={summary.cleanliness} />
            <Metric label={t('mood.communication')} value={summary.communication} />
          </View>
        ) : (
          <EmptyState title={t('mood.privateTitle')} body={t('mood.privateBody')} icon="lock" tone="aqua" />
        )}
        <AppText variant="small" style={{ color: colors.textMuted }}>{t('mood.answers', { count: summary?.count || 0 })}</AppText>
      </Card>
    </Screen>
  );
}

function Metric({ label, value }: { label: string; value: number | null }) {
  return <MetricCard label={label} value={`${value ?? '-'} / 5`} icon="chart-simple" tone="aqua" />;
}

function RatingSelector({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  const colors = useThemeColors();
  const styles = useMemo(() => StyleSheet.create({
    ratingRow: { gap: spacing.xs },
    ratingOptions: { flexDirection: 'row', gap: spacing.sm },
    ratingChip: {
      width: 40,
      height: 40,
      borderRadius: radii.pill,
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center'
    },
    ratingChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary
    },
    ratingChipText: { color: colors.text },
    ratingChipTextActive: { color: '#FFFFFF', fontWeight: '800' }
  }), [colors]);

  return (
    <View style={styles.ratingRow}>
      <AppText variant="small" style={{ color: colors.textMuted }}>{label}</AppText>
      <View style={styles.ratingOptions}>
        {[1, 2, 3, 4, 5].map(n => (
          <Pressable
            key={n}
            onPress={() => onChange(n)}
            style={[styles.ratingChip, n === value && styles.ratingChipActive]}
          >
            <AppText style={n === value ? styles.ratingChipTextActive : styles.ratingChipText}>{n}</AppText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
