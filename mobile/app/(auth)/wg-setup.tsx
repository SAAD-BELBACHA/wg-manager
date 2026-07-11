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
import { PENDING_INVITE_KEY } from '@/invite';
import { spacing } from '@/theme/tokens';
import { useThemeColors } from '@/theme/ThemeContext';

export default function WgSetupScreen() {
  const { createHousehold, joinHousehold } = useAuth();
  const colors = useThemeColors();
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
      setError('WG-Name ist erforderlich.');
      return;
    }

    setLoading('create');
    try {
      await createHousehold(name.trim());
      router.replace('/(tabs)');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'WG konnte nicht erstellt werden.');
    } finally {
      setLoading(null);
    }
  }

  async function join() {
    setError('');
    if (!inviteCode.trim()) {
      setError('Einladungscode ist erforderlich.');
      return;
    }

    setLoading('join');
    try {
      await joinHousehold(inviteCode.trim().toUpperCase());
      router.replace('/(tabs)');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'WG konnte nicht beigetreten werden.');
    } finally {
      setLoading(null);
    }
  }

  const joinCard = (
    <Card tone={invitedVia ? 'aqua' : 'soft'}>
      <View style={styles.form}>
        {invitedVia ? <StatusPill label="Du wurdest eingeladen" tone="primary" /> : null}
        <AppText variant="h2">WG beitreten</AppText>
        {invitedVia ? (
          <AppText variant="muted">Dein Einladungscode ist schon eingetragen — nur noch bestätigen.</AppText>
        ) : null}
        <TextField label="Einladungscode" value={inviteCode} onChangeText={setInviteCode} autoCapitalize="characters" />
        <Button title="Beitreten" icon="right-to-bracket" variant={invitedVia ? 'primary' : 'secondary'} loading={loading === 'join'} onPress={join} />
      </View>
    </Card>
  );

  const createCard = (
    <Card tone={invitedVia ? 'soft' : 'aqua'}>
      <View style={styles.form}>
        <AppText variant="h2">Neue WG erstellen</AppText>
        <TextField label="WG-Name" value={name} onChangeText={setName} />
        <Button title="WG erstellen" icon="plus" variant={invitedVia ? 'secondary' : 'primary'} loading={loading === 'create'} onPress={create} />
      </View>
    </Card>
  );

  return (
    <Screen>
      <AppHeader
        title={invitedVia ? 'Fast drin' : 'Deine WG'}
        subtitle={invitedVia ? 'Tritt der WG bei, zu der du eingeladen wurdest.' : 'Erstelle eine WG oder tritt per Einladungscode bei.'}
        eyebrow="Home"
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
