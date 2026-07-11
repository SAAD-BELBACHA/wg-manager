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
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { Poll } from '@/types/api';
import { radii, spacing } from '@/theme/tokens';
import { useThemeColors } from '@/theme/ThemeContext';

export default function PollsScreen() {
  const { token } = useAuth();
  const colors = useThemeColors();
  const { t } = useTranslation();
  const styles = useMemo(() => StyleSheet.create({
    form: { gap: spacing.md },
    poll: { gap: spacing.sm, paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
    option: {
      backgroundColor: colors.surfaceMuted,
      borderRadius: radii.lg,
      padding: spacing.md,
      gap: spacing.xs,
      borderWidth: 1,
      borderColor: colors.border
    }
  }), [colors]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [title, setTitle] = useState('');
  const [options, setOptions] = useState('Ja, Nein');
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    if (!token) return;
    setLoading(true);
    apiRequest<{ polls: Poll[] }>('/polls', { token })
      .then(data => setPolls(data.polls))
      .finally(() => setLoading(false));
  }, [token]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function addPoll() {
    if (!title.trim()) return;
    const data = await apiRequest<{ poll: Poll }>('/polls', {
      method: 'POST',
      token,
      body: { title: title.trim(), options: options.split(',').map(option => option.trim()) }
    });
    setPolls(current => [data.poll, ...current]);
    setTitle('');
  }

  async function vote(poll: Poll, optionId: number) {
    const data = await apiRequest<{ poll: Poll }>(`/polls/${poll.id}/vote`, {
      method: 'POST',
      token,
      body: { option_id: optionId }
    });
    setPolls(current => current.map(item => item.id === poll.id ? data.poll : item));
  }

  return (
    <Screen>
      <AppHeader title={t('polls.title')} subtitle={t('polls.subtitle')} eyebrow={t('polls.eyebrow')} icon="square-poll-vertical" back />
      <Card tone="soft">
        <View style={styles.form}>
          <TextField label={t('polls.question')} value={title} onChangeText={setTitle} placeholder={t('polls.questionPlaceholder')} />
          <TextField label={t('polls.options')} value={options} onChangeText={setOptions} placeholder={t('polls.optionsPlaceholder')} />
          <Button title={t('polls.create')} icon="plus" onPress={addPoll} />
        </View>
      </Card>
      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      <Card>
        <AppText variant="h2">{t('polls.active')}</AppText>
        {polls.length ? polls.map(poll => (
          <View key={poll.id} style={styles.poll}>
            <AppText>{poll.title}</AppText>
            {poll.options.map(option => (
              <Pressable key={option.id} onPress={() => vote(poll, option.id)} style={styles.option}>
                <AppText>{option.text}</AppText>
                <AppText variant="small" style={{ color: colors.textMuted }}>{t('polls.votes', { count: option.votes })}</AppText>
              </Pressable>
            ))}
          </View>
        )) : <EmptyState title={t('polls.emptyTitle')} body={t('polls.emptyBody')} icon="square-poll-vertical" tone="primary" />}
      </Card>
    </Screen>
  );
}
