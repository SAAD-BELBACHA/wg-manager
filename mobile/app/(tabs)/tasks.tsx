import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { AppHeader } from '@/components/AppHeader';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ListRow } from '@/components/ListRow';
import { MemberAvatar } from '@/components/MemberAvatar';
import { MetricCard } from '@/components/MetricCard';
import { Screen } from '@/components/Screen';
import { StatusPill } from '@/components/StatusPill';
import { TextField } from '@/components/TextField';
import { apiRequest } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { useTranslation } from '@/i18n/I18nContext';
import { Recurrence, Task, TasksResponse, User } from '@/types/api';
import { radii, spacing } from '@/theme/tokens';
import { useThemeColors } from '@/theme/ThemeContext';

const RECURRENCE_OPTIONS: { value: Recurrence; labelKey: string }[] = [
  { value: 'none', labelKey: 'tasks.recNone' },
  { value: 'daily', labelKey: 'tasks.recDaily' },
  { value: 'weekly', labelKey: 'tasks.recWeekly' },
  { value: 'biweekly', labelKey: 'tasks.recBiweekly' },
  { value: 'monthly', labelKey: 'tasks.recMonthly' }
];

const RECURRENCE_LABEL: Record<Recurrence, string> = {
  none: 'tasks.recNone',
  daily: 'tasks.recDaily',
  weekly: 'tasks.recWeekly',
  biweekly: 'tasks.recBiweekly',
  monthly: 'tasks.recMonthly'
};

export default function TasksScreen() {
  const { token } = useAuth();
  const colors = useThemeColors();
  const { t } = useTranslation();
  const styles = useMemo(() => StyleSheet.create({
    metrics: { flexDirection: 'row', gap: spacing.md },
    form: { gap: spacing.md },
    error: { color: colors.danger },
    label: { color: colors.textMuted, fontWeight: '700' },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    chip: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: radii.pill,
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.border
    },
    chipActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
    chipText: { fontWeight: '700', color: colors.text },
    chipTextActive: { color: colors.primary },
    assigneeChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: 6,
      paddingHorizontal: spacing.md,
      borderRadius: radii.pill,
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.border
    }
  }), [colors]);

  const [openTasks, setOpenTasks] = useState<Task[]>([]);
  const [doneTasks, setDoneTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [title, setTitle] = useState('');
  const [recurrence, setRecurrence] = useState<Recurrence>('none');
  const [assignee, setAssignee] = useState<number | null>(null);
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
        setMembers(data.members);
      })
      .catch(err => setError(err instanceof Error ? err.message : t('tasks.loadError')))
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
        body: { title: title.trim(), description: '', recurrence, assigned_to: assignee }
      });
      setOpenTasks(current => [data.task, ...current]);
      setTitle('');
      setRecurrence('none');
      setAssignee(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('tasks.createFailed'));
    } finally {
      setSaving(false);
    }
  }

  async function toggleTask(task: Task) {
    setError('');
    try {
      const data = await apiRequest<{ task: Task; spawned_task?: Task }>(`/tasks/${task.id}/toggle`, {
        method: 'POST',
        token
      });
      if (data.task.completed) {
        setOpenTasks(current => current.filter(item => item.id !== task.id));
        setDoneTasks(current => [data.task, ...current]);
        // A recurring chore spawns its next occurrence — show it immediately.
        if (data.spawned_task) {
          setOpenTasks(current => [data.spawned_task as Task, ...current]);
        }
      } else {
        setDoneTasks(current => current.filter(item => item.id !== task.id));
        setOpenTasks(current => [data.task, ...current]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('tasks.toggleFailed'));
    }
  }

  return (
    <Screen>
      <AppHeader title={t('tasks.title')} subtitle={t('tasks.subtitle')} eyebrow={t('tasks.eyebrow')} icon="list-check" />

      <View style={styles.metrics}>
        <MetricCard label={t('tasks.open')} value={String(openTasks.length)} helper={t('tasks.openHelper')} icon="circle" tone="aqua" />
        <MetricCard label={t('tasks.done')} value={String(doneTasks.length)} helper={t('tasks.doneHelper')} icon="check" tone="lime" />
      </View>

      <Card tone="soft">
        <View style={styles.form}>
          <TextField label={t('tasks.newTask')} value={title} onChangeText={setTitle} placeholder={t('tasks.newTaskPlaceholder')} />

          <View>
            <AppText variant="small" style={styles.label}>{t('tasks.repeat')}</AppText>
            <View style={styles.chipRow}>
              {RECURRENCE_OPTIONS.map(option => (
                <Pressable
                  key={option.value}
                  onPress={() => setRecurrence(option.value)}
                  style={[styles.chip, recurrence === option.value && styles.chipActive]}
                >
                  <AppText variant="small" style={[styles.chipText, recurrence === option.value && styles.chipTextActive]}>
                    {t(option.labelKey)}
                  </AppText>
                </Pressable>
              ))}
            </View>
          </View>

          <View>
            <AppText variant="small" style={styles.label}>
              {recurrence === 'none' ? t('tasks.assignee') : `${t('tasks.assignee')} · ${t('tasks.rotates')}`}
            </AppText>
            <View style={styles.chipRow}>
              <Pressable
                onPress={() => setAssignee(null)}
                style={[styles.chip, assignee === null && styles.chipActive]}
              >
                <AppText variant="small" style={[styles.chipText, assignee === null && styles.chipTextActive]}>
                  {t('tasks.assigneeAnyone')}
                </AppText>
              </Pressable>
              {members.map(member => (
                <Pressable
                  key={member.id}
                  onPress={() => setAssignee(member.id)}
                  style={[styles.assigneeChip, assignee === member.id && styles.chipActive]}
                >
                  <MemberAvatar user={member} size={22} />
                  <AppText variant="small" style={[styles.chipText, assignee === member.id && styles.chipTextActive]}>
                    {member.username}
                  </AppText>
                </Pressable>
              ))}
            </View>
          </View>

          <Button title={t('tasks.addTask')} icon="plus" loading={saving} onPress={addTask} />
        </View>
      </Card>

      {error ? <AppText variant="small" style={styles.error}>{error}</AppText> : null}
      {loading ? <ActivityIndicator color={colors.primary} /> : null}

      <Card>
        <AppText variant="h2">{t('tasks.open')}</AppText>
        {openTasks.length ? openTasks.map(task => (
          <TaskRow key={task.id} task={task} onToggle={() => toggleTask(task)} />
        )) : <EmptyState title={t('tasks.emptyOpenTitle')} body={t('tasks.emptyOpenBody')} icon="mug-saucer" tone="lime" />}
      </Card>

      <Card>
        <AppText variant="h2">{t('tasks.done')}</AppText>
        {doneTasks.length ? doneTasks.slice(0, 5).map(task => (
          <TaskRow key={task.id} task={task} onToggle={() => toggleTask(task)} done />
        )) : <EmptyState title={t('tasks.emptyDoneTitle')} body={t('tasks.emptyDoneBody')} icon="sparkles" tone="aqua" />}
      </Card>
    </Screen>
  );
}

function TaskRow({ task, done, onToggle }: { task: Task; done?: boolean; onToggle: () => void }) {
  const { t } = useTranslation();
  const subtitle = task.assigned_to ? t('tasks.turnOf', { name: task.assigned_to.username }) : t('tasks.unassigned');
  return (
    <ListRow
      title={task.title}
      subtitle={subtitle}
      icon="broom"
      checked={done}
      muted={done}
      onPress={onToggle}
    >
      {task.recurrence && task.recurrence !== 'none' && !done ? (
        <StatusPill label={t(RECURRENCE_LABEL[task.recurrence])} tone="aqua" />
      ) : null}
    </ListRow>
  );
}
