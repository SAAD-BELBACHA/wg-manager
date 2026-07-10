import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { apiRequest } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { AppHeader } from '@/components/AppHeader';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ListRow } from '@/components/ListRow';
import { Screen } from '@/components/Screen';
import { StatusPill } from '@/components/StatusPill';
import { TextField } from '@/components/TextField';
import { ConflictReport } from '@/types/api';
import { colors, spacing } from '@/theme/tokens';

export default function ConflictsScreen() {
  const { token } = useAuth();
  const [conflicts, setConflicts] = useState<ConflictReport[]>([]);
  const [description, setDescription] = useState('');
  const [solution, setSolution] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    if (!token) return;
    setLoading(true);
    apiRequest<{ conflicts: ConflictReport[] }>('/conflicts', { token })
      .then(data => setConflicts(data.conflicts))
      .finally(() => setLoading(false));
  }, [token]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function addConflict() {
    if (!description.trim()) return;
    const data = await apiRequest<{ conflict: ConflictReport }>('/conflicts', {
      method: 'POST',
      token,
      body: {
        category: 'communication',
        urgency: 'normal',
        description: description.trim(),
        desired_solution: solution.trim(),
        anonymous: false
      }
    });
    setConflicts(current => [data.conflict, ...current]);
    setDescription('');
    setSolution('');
  }

  return (
    <Screen>
      <AppHeader title="Konflikte" subtitle="Sachlich notieren, bevor es laut wird." eyebrow="Safe" icon="comments" back />
      <Card tone="aqua">
        <AppText variant="muted">
          Geschützter Bereich. KI-Umformulierung kommt später; aktuell wird sachlich dokumentiert.
        </AppText>
      </Card>
      <Card tone="soft">
        <View style={styles.form}>
          <TextField label="Problem" value={description} onChangeText={setDescription} placeholder="Was ist passiert?" />
          <TextField label="Gewünschte Lösung" value={solution} onChangeText={setSolution} placeholder="Was wäre fair?" />
          <Button title="Konflikt erfassen" icon="plus" onPress={addConflict} />
        </View>
      </Card>
      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      <Card>
        <AppText variant="h2">Fälle</AppText>
        {conflicts.length ? conflicts.map(conflict => (
          <ListRow
            key={conflict.id}
            title={conflict.description}
            subtitle={conflict.desired_solution || 'Keine Lösung angegeben.'}
            icon="comments"
          >
            <StatusPill label={conflict.status} tone="coral" />
          </ListRow>
        )) : <EmptyState title="Keine Fälle" body="Gut so. Falls etwas passiert, kann es hier ruhig landen." icon="heart" tone="lime" />}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.md }
});
