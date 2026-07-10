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
import { TextField } from '@/components/TextField';
import { CalendarEvent } from '@/types/api';
import { colors, spacing } from '@/theme/tokens';

export default function CalendarScreen() {
  const { token } = useAuth();
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
      .catch(err => setError(err instanceof Error ? err.message : 'Kalender konnte nicht geladen werden.'))
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
      setError(err instanceof Error ? err.message : 'Termin konnte nicht erstellt werden.');
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
      <AppHeader title="Kalender" subtitle="Termine, WG-Absprachen und kleine Fixpunkte." eyebrow="Plan" icon="calendar-days" back />
      <Card tone="soft">
        <View style={styles.form}>
          <TextField label="Termin" value={title} onChangeText={setTitle} placeholder="z.B. WG-Besprechung" />
          <TextField label="Notiz" value={notes} onChangeText={setNotes} placeholder="Details" />
          <Button title="Termin erstellen" icon="plus" loading={saving} onPress={addEvent} />
        </View>
      </Card>
      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      {error ? <AppText variant="small" style={styles.error}>{error}</AppText> : null}
      <Card>
        <AppText variant="h2">Agenda</AppText>
        {events.length ? events.map(event => (
          <ListRow
            key={event.id}
            title={event.title}
            subtitle={new Date(event.starts_at).toLocaleString()}
            icon="calendar-day"
            actionLabel="Löschen"
            onAction={() => deleteEvent(event)}
          />
        )) : <EmptyState title="Keine Termine" body="Neue WG-Termine erscheinen hier." icon="calendar-days" tone="aqua" />}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.md },
  error: { color: colors.danger }
});
