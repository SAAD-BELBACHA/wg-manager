import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppHeader } from '@/components/AppHeader';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { useAuth } from '@/auth/AuthContext';
import { spacing, colors } from '@/theme/tokens';

export default function WgSetupScreen() {
  const { createHousehold, joinHousehold } = useAuth();
  const [name, setName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState<'create' | 'join' | null>(null);
  const [error, setError] = useState('');

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

  return (
    <Screen>
      <AppHeader title="Deine WG" subtitle="Erstelle eine WG oder tritt per Einladungscode bei." eyebrow="Home" icon="people-roof" />

      <Card tone="aqua">
        <View style={styles.form}>
          <AppText variant="h2">Neue WG erstellen</AppText>
          <TextField label="WG-Name" value={name} onChangeText={setName} />
          <Button title="WG erstellen" icon="plus" loading={loading === 'create'} onPress={create} />
        </View>
      </Card>

      <Card tone="soft">
        <View style={styles.form}>
          <AppText variant="h2">WG beitreten</AppText>
          <TextField label="Einladungscode" value={inviteCode} onChangeText={setInviteCode} autoCapitalize="characters" />
          <Button title="Beitreten" icon="right-to-bracket" variant="secondary" loading={loading === 'join'} onPress={join} />
        </View>
      </Card>

      {error ? <AppText variant="small" style={styles.error}>{error}</AppText> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.md
  },
  error: {
    color: colors.danger
  }
});
