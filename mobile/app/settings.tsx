import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Platform, Pressable, Share, StyleSheet, View } from 'react-native';
import { apiRequest } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { AppHeader } from '@/components/AppHeader';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ListRow } from '@/components/ListRow';
import { Screen } from '@/components/Screen';
import { radii, spacing } from '@/theme/tokens';
import { ThemeMode, useTheme, useThemeColors } from '@/theme/ThemeContext';

const THEME_OPTIONS: { mode: ThemeMode; label: string; icon: 'circle-half-stroke' | 'sun' | 'moon' }[] = [
  { mode: 'system', label: 'System', icon: 'circle-half-stroke' },
  { mode: 'light', label: 'Hell', icon: 'sun' },
  { mode: 'dark', label: 'Dunkel', icon: 'moon' }
];

export default function SettingsScreen() {
  const { token, user, logout } = useAuth();
  const { themeMode, setThemeMode } = useTheme();
  const colors = useThemeColors();
  const styles = useMemo(() => StyleSheet.create({
    themeRow: {
      flexDirection: 'row',
      gap: spacing.sm
    },
    themeOption: {
      flex: 1,
      alignItems: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.md,
      borderRadius: radii.lg,
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.border
    },
    themeOptionActive: {
      backgroundColor: colors.primarySoft,
      borderColor: colors.primary
    },
    themeLabel: {
      fontWeight: '800'
    },
    error: {
      color: colors.danger
    },
    success: {
      color: colors.success,
      fontWeight: '700'
    }
  }), [colors]);

  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function exportData() {
    setError('');
    setMessage('');
    setExporting(true);
    try {
      const data = await apiRequest('/account/export', { token });
      const json = JSON.stringify(data, null, 2);
      if (Platform.OS === 'web') {
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'zofri-daten.json';
        link.click();
        URL.revokeObjectURL(url);
      } else {
        await Share.share({ message: json, title: 'Zofri-Daten' });
      }
      setMessage('Export bereit.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export fehlgeschlagen.');
    } finally {
      setExporting(false);
    }
  }

  function confirmDeleteAccount() {
    Alert.alert(
      'Konto wirklich löschen?',
      'Dein Profil wird anonymisiert und du wirst aus deiner WG entfernt. Gemeinsame Aufgaben und Ausgaben bleiben für deine Mitbewohner sichtbar. Das kann nicht rückgängig gemacht werden.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        { text: 'Konto löschen', style: 'destructive', onPress: deleteAccount }
      ]
    );
  }

  async function deleteAccount() {
    setError('');
    setDeleting(true);
    try {
      await apiRequest('/account', { method: 'DELETE', token });
      await logout();
      router.replace('/(auth)/welcome');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Konto konnte nicht gelöscht werden.');
      setDeleting(false);
    }
  }

  return (
    <Screen>
      <AppHeader title="Einstellungen" subtitle="Design, Sprache, Daten und Konto." eyebrow="Setup" icon="gear" back />

      <Card>
        <AppText variant="h2">Konto</AppText>
        <ListRow title={user?.username || '-'} subtitle={user?.email || ''} icon="circle-user" />
      </Card>

      <Card>
        <AppText variant="h2">Darstellung</AppText>
        <View style={styles.themeRow}>
          {THEME_OPTIONS.map(option => (
            <Pressable
              key={option.mode}
              onPress={() => setThemeMode(option.mode)}
              style={[styles.themeOption, themeMode === option.mode && styles.themeOptionActive]}
            >
              <AppText style={styles.themeLabel}>{option.label}</AppText>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card>
        <AppText variant="h2">Sprache</AppText>
        <ListRow title="Deutsch" subtitle="Weitere Sprachen sind für später geplant." icon="language" />
      </Card>

      <Card>
        <AppText variant="h2">Benachrichtigungen</AppText>
        <ListRow title="Push-Benachrichtigungen" subtitle="Noch nicht angebunden. In-App-Meldungen funktionieren bereits." icon="bell" />
      </Card>

      <Card>
        <AppText variant="h2">Datenschutz</AppText>
        <ListRow title="Meine Daten exportieren" subtitle="Alle deine Inhalte als JSON-Datei." icon="download" />
        <Button title="Daten exportieren" icon="download" variant="secondary" loading={exporting} onPress={exportData} />
        {message ? <AppText variant="small" style={styles.success}>{message}</AppText> : null}
      </Card>

      <Card tone="soft">
        <AppText variant="h2">Konto löschen</AppText>
        <AppText variant="muted">
          Entfernt dich aus deiner WG und anonymisiert dein Profil dauerhaft.
        </AppText>
        {error ? <AppText variant="small" style={styles.error}>{error}</AppText> : null}
        <Button title="Konto löschen" icon="trash" variant="danger" loading={deleting} onPress={confirmDeleteAccount} />
      </Card>
    </Screen>
  );
}
