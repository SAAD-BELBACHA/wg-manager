import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppHeader } from '@/components/AppHeader';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { StatusPill } from '@/components/StatusPill';
import { TextField } from '@/components/TextField';
import { useAuth } from '@/auth/AuthContext';
import { useTranslation } from '@/i18n/I18nContext';
import { PENDING_INVITE_KEY } from '@/invite';
import { spacing } from '@/theme/tokens';
import { useThemeColors } from '@/theme/ThemeContext';

export default function WgSetupScreen() {
  const { createHousehold, joinHousehold } = useAuth();
  const colors = useThemeColors();
  const { t } = useTranslation();
  const [invitedVia, setInvitedVia] = useState(false);
  const styles = useMemo(() => StyleSheet.create({
    form: {
      gap: spacing.md
    },
    error: {
      color: colors.danger
    }
  }), [colors]);
  const [name, setName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState<'create' | 'join' | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    AsyncStorage.getItem(PENDING_INVITE_KEY).then(code => {
      if (code) {
        setInviteCode(code);
        setInvitedVia(true);
        AsyncStorage.removeItem(PENDING_INVITE_KEY);
      }
    });
  }, []);

  async function create() {
    setError('');
    if (!name.trim()) {
      setError(t('wgSetup.nameRequired'));
      return;
    }

    setLoading('create');
    try {
      await createHousehold(name.trim());
      router.replace('/(tabs)');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('wgSetup.createFailed'));
    } finally {
      setLoading(null);
    }
  }

  async function join() {
    setError('');
    if (!inviteCode.trim()) {
      setError(t('wgSetup.codeRequired'));
      return;
    }

    setLoading('join');
    try {
      await joinHousehold(inviteCode.trim().toUpperCase());
      router.replace('/(tabs)');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('wgSetup.joinFailed'));
    } finally {
      setLoading(null);
    }
  }

  const joinCard = (
    <Card tone={invitedVia ? 'aqua' : 'soft'}>
      <View style={styles.form}>
        {invitedVia ? <StatusPill label={t('wgSetup.invitedBadge')} tone="primary" /> : null}
        <AppText variant="h2">{t('wgSetup.joinTitle')}</AppText>
        {invitedVia ? (
          <AppText variant="muted">{t('wgSetup.joinPrefilled')}</AppText>
        ) : null}
        <TextField label={t('wgSetup.inviteCode')} value={inviteCode} onChangeText={setInviteCode} autoCapitalize="characters" />
        <Button title={t('wgSetup.joinButton')} icon="right-to-bracket" variant={invitedVia ? 'primary' : 'secondary'} loading={loading === 'join'} onPress={join} />
      </View>
    </Card>
  );

  const createCard = (
    <Card tone={invitedVia ? 'soft' : 'aqua'}>
      <View style={styles.form}>
        <AppText variant="h2">{t('wgSetup.createTitle')}</AppText>
        <TextField label={t('wgSetup.wgName')} value={name} onChangeText={setName} />
        <Button title={t('wgSetup.createButton')} icon="plus" variant={invitedVia ? 'secondary' : 'primary'} loading={loading === 'create'} onPress={create} />
      </View>
    </Card>
  );

  return (
    <Screen>
      <AppHeader
        title={invitedVia ? t('wgSetup.invitedTitle') : t('wgSetup.title')}
        subtitle={invitedVia ? t('wgSetup.invitedSubtitle') : t('wgSetup.subtitle')}
        eyebrow={t('wgSetup.eyebrow')}
        icon="people-roof"
      />

      {invitedVia ? (
        <>
          {joinCard}
          {createCard}
        </>
      ) : (
        <>
          {createCard}
          {joinCard}
        </>
      )}

      {error ? <AppText variant="small" style={styles.error}>{error}</AppText> : null}
    </Screen>
  );
}
