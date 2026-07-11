import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { apiRequest } from '@/api/client';
import { AppHeader } from '@/components/AppHeader';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { colors, spacing } from '@/theme/tokens';

export default function ForgotPasswordScreen() {
  const [step, setStep] = useState<'email' | 'reset'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  async function requestCode() {
    setError('');
    if (!email) {
      setError('E-Mail ist erforderlich.');
      return;
    }
    setLoading(true);
    try {
      const data = await apiRequest<{ message: string }>('/auth/forgot-password', {
        method: 'POST',
        body: { email }
      });
      setInfo(data.message);
      setStep('reset');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Anfrage fehlgeschlagen.');
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword() {
    setError('');
    if (!code || password.length < 6) {
      setError('Code und ein Passwort mit mindestens 6 Zeichen sind erforderlich.');
      return;
    }
    setLoading(true);
    try {
      await apiRequest('/auth/reset-password', {
        method: 'POST',
        body: { email, code, password }
      });
      router.replace('/(auth)/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Zurücksetzen fehlgeschlagen.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <AppHeader
        title="Passwort"
        subtitle={step === 'email' ? 'Wir senden dir einen Code an deine E-Mail.' : 'Code eingeben und neues Passwort setzen.'}
        eyebrow="Hilfe"
        icon="key"
        back
      />

      {step === 'email' ? (
        <Card tone="soft">
          <View style={styles.form}>
            <TextField label="E-Mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
            {error ? <AppText variant="small" style={styles.error}>{error}</AppText> : null}
            <Button title="Code anfordern" icon="paper-plane" loading={loading} onPress={requestCode} />
          </View>
        </Card>
      ) : (
        <Card tone="soft">
          <View style={styles.form}>
            {info ? <AppText variant="muted">{info}</AppText> : null}
            <TextField label="Code (6-stellig)" value={code} onChangeText={setCode} keyboardType="number-pad" />
            <TextField label="Neues Passwort" value={password} onChangeText={setPassword} secureTextEntry />
            {error ? <AppText variant="small" style={styles.error}>{error}</AppText> : null}
            <Button title="Passwort setzen" icon="key" loading={loading} onPress={resetPassword} />
            <Pressable onPress={requestCode}>
              <AppText variant="small" style={styles.link}>Code erneut senden</AppText>
            </Pressable>
          </View>
        </Card>
      )}

      <Button title="Zurück zum Login" variant="ghost" icon="chevron-left" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.md },
  link: { color: colors.primary, fontWeight: '800' },
  error: { color: colors.danger }
});
