import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { apiRequest } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { useTranslation } from '@/i18n/I18nContext';
import { AppHeader } from '@/components/AppHeader';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ListRow } from '@/components/ListRow';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { CalendarEvent } from '@/types/api';
import { spacing } from '@/theme/tokens';
import { useThemeColors } from '@/theme/ThemeContext';

export default function CalendarScreen() {
  const { token } = useAuth();
  const colors = useThemeColors();
  const { t } = useTranslation();
  const styles = useMemo(() => StyleSheet.create({
    form: { gap: spacing.md },
    error: { color: colors.danger }
  }), [colors]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    if (!token) return;
    setLoading(true);
    apiRequest<{ events: CalendarEvent[] }>('/calendar-events', { token })
      .then(data => setEvents(data.events))
      .catch(err => setError(err instanceof Error ? err.message : t('calendar.loadError')))
      .finally(() => setLoading(false));
  }, [token]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function addEvent() {
    if (!title.trim()) return;
    setSaving(true);
    setError('');
    try {
      const data = await apiRequest<{ event: CalendarEvent }>('/calendar-events', {
        method: 'POST',
        token,
        body: { title: title.trim(), notes: notes.trim(), event_type: 'wg', starts_at: new Date().toISOString() }
      });
      setEvents(current => [data.event, ...current]);
      setTitle('');
      setNotes('');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('calendar.createFailed'));
    } finally {
      setSaving(false);
    }
  }

  async function deleteEvent(event: CalendarEvent) {
    await apiRequest<{ success: boolean }>(`/calendar-events/${event.id}`, { method: 'DELETE', token });
    setEvents(current => current.filter(item => item.id !== event.id));
  }

  return (
    <Screen>
      <AppHeader title={t('calendar.title')} subtitle={t('calendar.subtitle')} eyebrow={t('calendar.eyebrow')} icon="calendar-days" back />
      <Card tone="soft">
        <View style={styles.form}>
          <TextField label={t('calendar.event')} value={title} onChangeText={setTitle} placeholder={t('calendar.eventPlaceholder')} />
          <TextField label={t('calendar.note')} value={notes} onChangeText={setNotes} placeholder={t('calendar.notePlaceholder')} />
          <Button title={t('calendar.createEvent')} icon="plus" loading={saving} onPress={addEvent} />
        </View>
      </Card>
      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      {error ? <AppText variant="small" style={styles.error}>{error}</AppText> : null}
      <Card>
        <AppText variant="h2">{t('calendar.agenda')}</AppText>
        {events.length ? events.map(event => (
          <ListRow
            key={event.id}
            title={event.title}
            subtitle={new Date(event.starts_at).toLocaleString()}
            icon="calendar-day"
            actionLabel={t('common.delete')}
            onAction={() => deleteEvent(event)}
          />
        )) : <EmptyState title={t('calendar.emptyTitle')} body={t('calendar.emptyBody')} icon="calendar-days" tone="aqua" />}
      </Card>
    </Screen>
  );
}
