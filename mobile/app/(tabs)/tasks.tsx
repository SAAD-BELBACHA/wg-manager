import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { AppHeader } from '@/components/AppHeader';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ListRow } from '@/components/ListRow';
import { MetricCard } from '@/components/MetricCard';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { apiRequest } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Task, TasksResponse } from '@/types/api';
import { colors, radii, spacing } from '@/theme/tokens';

export default function TasksScreen() {
  const { token } = useAuth();
  const [openTasks, setOpenTasks] = useState<Task[]>([]);
  const [doneTasks, setDoneTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadTasks = useCallback(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    apiRequest<TasksResponse>('/tasks', { token })
      .then(data => {
        setOpenTasks(data.open_tasks);
        setDoneTasks(data.done_tasks);
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Aufgaben konnten nicht geladen werden.'))
      .finally(() => setLoading(false));
  }, [token]);

  useFocusEffect(useCallback(() => {
    loadTasks();
  }, [loadTasks]));

  async function addTask() {
    if (!title.trim()) return;
    setSaving(true);
    setError('');
    try {
      const data = await apiRequest<{ task: Task }>('/tasks', {
        method: 'POST',
        token,
        body: { title: title.trim(), description: '' }
      });
      setOpenTasks(current => [data.task, ...current]);
      setTitle('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Aufgabe konnte nicht erstellt werden.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleTask(task: Task) {
    setError('');
    try {
      const data = await apiRequest<{ task: Task }>(`/tasks/${task.id}/toggle`, {
        method: 'POST',
        token
      });
      if (data.task.completed) {
        setOpenTasks(current => current.filter(item => item.id !== task.id));
        setDoneTasks(current => [data.task, ...current]);
      } else {
        setDoneTasks(current => current.filter(item => item.id !== task.id));
        setOpenTasks(current => [data.task, ...current]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Aufgabe konnte nicht geaendert werden.');
    }
  }

  return (
    <Screen>
      <AppHeader title="Aufgaben" subtitle="Schnell erfassen, fair verteilen, sichtbar erledigen." eyebrow="WG Rhythmus" icon="list-check" />

      <View style={styles.metrics}>
        <MetricCard label="Offen" value={String(openTasks.length)} helper="wartet gerade" icon="circle" tone="aqua" />
        <MetricCard label="Erledigt" value={String(doneTasks.length)} helper="letzte Runde" icon="check" tone="lime" />
      </View>

      <Card tone="soft">
        <View style={styles.form}>
          <TextField label="Neue Aufgabe" value={title} onChangeText={setTitle} placeholder="z.B. Küche putzen" />
          <Button title="Aufgabe hinzufügen" icon="plus" loading={saving} onPress={addTask} />
        </View>
      </Card>

      {error ? <AppText variant="small" style={styles.error}>{error}</AppText> : null}
      {loading ? <ActivityIndicator color={colors.primary} /> : null}

      <Card>
        <AppText variant="h2">Offen</AppText>
        {openTasks.length ? openTasks.map(task => (
          <TaskRow key={task.id} task={task} onToggle={() => toggleTask(task)} />
        )) : <EmptyState title="Alles frei" body="Keine offenen Aufgaben. WG atmet kurz durch." icon="mug-saucer" tone="lime" />}
      </Card>

      <Card>
        <AppText variant="h2">Erledigt</AppText>
        {doneTasks.length ? doneTasks.slice(0, 5).map(task => (
          <TaskRow key={task.id} task={task} onToggle={() => toggleTask(task)} done />
        )) : <EmptyState title="Noch nichts abgehakt" body="Sobald etwas fertig ist, landet es hier." icon="sparkles" tone="aqua" />}
      </Card>
    </Screen>
  );
}

function TaskRow({ task, done, onToggle }: { task: Task; done?: boolean; onToggle: () => void }) {
  return (
    <ListRow
      title={task.title}
      subtitle={task.assigned_to ? task.assigned_to.username : 'Noch nicht zugewiesen'}
      icon="broom"
      checked={done}
      muted={done}
      onPress={onToggle}
    />
  );
}

const styles = StyleSheet.create({
  metrics: {
    flexDirection: 'row',
    gap: spacing.md
  },
  form: {
    gap: spacing.md
  },
  error: {
    color: colors.danger
  }
});
