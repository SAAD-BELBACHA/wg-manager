import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { apiRequest } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { AppHeader } from '@/components/AppHeader';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { Poll } from '@/types/api';
import { colors, radii, spacing } from '@/theme/tokens';

export default function PollsScreen() {
  const { token } = useAuth();
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
      <AppHeader title="Abstimmungen" subtitle="Schnelle WG-Entscheidungen ohne Endloschat." eyebrow="Vote" icon="square-poll-vertical" back />
      <Card tone="soft">
        <View style={styles.form}>
          <TextField label="Frage" value={title} onChangeText={setTitle} placeholder="Worüber abstimmen?" />
          <TextField label="Optionen" value={options} onChangeText={setOptions} placeholder="Komma getrennt" />
          <Button title="Abstimmung erstellen" icon="plus" onPress={addPoll} />
        </View>
      </Card>
      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      <Card>
        <AppText variant="h2">Aktiv</AppText>
        {polls.length ? polls.map(poll => (
          <View key={poll.id} style={styles.poll}>
            <AppText>{poll.title}</AppText>
            {poll.options.map(option => (
              <Pressable key={option.id} onPress={() => vote(poll, option.id)} style={styles.option}>
                <AppText>{option.text}</AppText>
                <AppText variant="small" style={{ color: colors.textMuted }}>{option.votes} Stimmen</AppText>
              </Pressable>
            ))}
          </View>
        )) : <EmptyState title="Keine Abstimmungen" body="Neue Entscheidungen erscheinen hier." icon="square-poll-vertical" tone="primary" />}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
});
