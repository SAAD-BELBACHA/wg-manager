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
import { LanguageMode, useTranslation } from '@/i18n/I18nContext';
import { radii, spacing } from '@/theme/tokens';
import { ThemeMode, useTheme, useThemeColors } from '@/theme/ThemeContext';

const THEME_OPTIONS: { mode: ThemeMode; labelKey: string }[] = [
  { mode: 'system', labelKey: 'settings.themeSystem' },
  { mode: 'light', labelKey: 'settings.themeLight' },
  { mode: 'dark', labelKey: 'settings.themeDark' }
];

const LANGUAGE_OPTIONS: { mode: LanguageMode; labelKey: string }[] = [
  { mode: 'system', labelKey: 'language.system' },
  { mode: 'de', labelKey: 'language.german' },
  { mode: 'en', labelKey: 'language.english' }
];

export default function SettingsScreen() {
  const { token, user, logout } = useAuth();
  const { themeMode, setThemeMode } = useTheme();
  const { t, languageMode, setLanguageMode } = useTranslation();
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
      setMessage(t('settings.exportReady'));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settings.exportFailed'));
    } finally {
      setExporting(false);
    }
  }

  function confirmDeleteAccount() {
    if (Platform.OS === 'web') {
      const ok = typeof window !== 'undefined' && window.confirm
        ? window.confirm(t('settings.deleteConfirmBody'))
        : true;
      if (ok) deleteAccount();
      return;
    }
    Alert.alert(
      t('settings.deleteConfirmTitle'),
      t('settings.deleteConfirmBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('settings.deleteButton'), style: 'destructive', onPress: deleteAccount }
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
      setError(err instanceof Error ? err.message : t('settings.deleteFailed'));
      setDeleting(false);
    }
  }

  return (
    <Screen>
      <AppHeader title={t('settings.title')} subtitle={t('settings.subtitle')} eyebrow={t('settings.eyebrow')} icon="gear" back />

      <Card>
        <AppText variant="h2">{t('settings.account')}</AppText>
        <ListRow title={user?.username || '-'} subtitle={user?.email || ''} icon="circle-user" />
      </Card>

      <Card>
        <AppText variant="h2">{t('settings.appearance')}</AppText>
        <View style={styles.themeRow}>
          {THEME_OPTIONS.map(option => (
            <Pressable
              key={option.mode}
              onPress={() => setThemeMode(option.mode)}
              style={[styles.themeOption, themeMode === option.mode && styles.themeOptionActive]}
            >
              <AppText style={styles.themeLabel}>{t(option.labelKey)}</AppText>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card>
        <AppText variant="h2">{t('language.title')}</AppText>
        <AppText variant="muted">{t('settings.languageNote')}</AppText>
        <View style={styles.themeRow}>
          {LANGUAGE_OPTIONS.map(option => (
            <Pressable
              key={option.mode}
              onPress={() => setLanguageMode(option.mode)}
              style={[styles.themeOption, languageMode === option.mode && styles.themeOptionActive]}
            >
              <AppText style={styles.themeLabel}>{t(option.labelKey)}</AppText>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card>
        <AppText variant="h2">{t('settings.notifications')}</AppText>
        <ListRow title={t('settings.push')} subtitle={t('settings.pushNote')} icon="bell" />
      </Card>

      <Card>
        <AppText variant="h2">{t('settings.privacy')}</AppText>
        <ListRow title={t('settings.exportTitle')} subtitle={t('settings.exportSub')} icon="download" />
        <Button title={t('settings.exportButton')} icon="download" variant="secondary" loading={exporting} onPress={exportData} />
        {message ? <AppText variant="small" style={styles.success}>{message}</AppText> : null}
      </Card>

      <Card tone="soft">
        <AppText variant="h2">{t('settings.deleteTitle')}</AppText>
        <AppText variant="muted">
          {t('settings.deleteBody')}
        </AppText>
        {error ? <AppText variant="small" style={styles.error}>{error}</AppText> : null}
        <Button title={t('settings.deleteButton')} icon="trash" variant="danger" loading={deleting} onPress={confirmDeleteAccount} />
      </Card>
    </Screen>
  );
}
