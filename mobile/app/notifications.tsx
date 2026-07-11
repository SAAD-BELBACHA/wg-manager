import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { apiRequest } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { AppHeader } from '@/components/AppHeader';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ListRow } from '@/components/ListRow';
import { Screen } from '@/components/Screen';
import { StatusPill } from '@/components/StatusPill';
import { AppNotification } from '@/types/api';
import { useThemeColors } from '@/theme/ThemeContext';

export default function NotificationsScreen() {
  const { token } = useAuth();
  const colors = useThemeColors();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    if (!token) return;
    setLoading(true);
    apiRequest<{ notifications: AppNotification[] }>('/notifications', { token })
      .then(data => setNotifications(data.notifications))
      .finally(() => setLoading(false));
  }, [token]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function markRead(notification: AppNotification) {
    const data = await apiRequest<{ notification: AppNotification }>(`/notifications/${notification.id}/read`, {
      method: 'POST',
      token
    });
    setNotifications(current => current.map(item => item.id === notification.id ? data.notification : item));
  }

  return (
    <Screen>
      <AppHeader title="Meldungen" subtitle="Was in deiner WG wichtig war." eyebrow="Inbox" icon="bell" back />
      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      <Card>
        {notifications.length ? notifications.map(notification => (
          <ListRow
            key={notification.id}
            title={notification.title}
            subtitle={notification.body}
            icon={notification.read ? 'envelope-open' : 'bell'}
            onPress={() => markRead(notification)}
          >
            <StatusPill label={notification.read ? 'gelesen' : 'neu'} tone={notification.read ? 'aqua' : 'coral'} />
          </ListRow>
        )) : <EmptyState title="Keine Meldungen" body="Alles ruhig. Neue Updates erscheinen hier." icon="bell" tone="lime" />}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({});
