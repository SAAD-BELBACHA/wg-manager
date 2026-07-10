import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppHeader } from '@/components/AppHeader';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { useAuth } from '@/auth/AuthContext';
import { colors, spacing } from '@/theme/tokens';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    setError('');
    if (!email || !password) {
      setError('E-Mail und Passwort sind erforderlich.');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      router.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login fehlgeschlagen.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <AppHeader title="Willkommen zurück" subtitle="Melde dich an, um deine WG zu organisieren." eyebrow="Login" icon="right-to-bracket" back />

      <Card tone="soft">
        <View style={styles.form}>
          <TextField label="E-Mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <TextField label="Passwort" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} />
          <Pressable onPress={() => setShowPassword(value => !value)}>
            <AppText variant="small" style={styles.link}>{showPassword ? 'Passwort ausblenden' : 'Passwort anzeigen'}</AppText>
          </Pressable>
          {error ? <AppText variant="small" style={styles.error}>{error}</AppText> : null}
          <Button title="Einloggen" icon="right-to-bracket" loading={loading} onPress={submit} />
          <Button title="Passwort vergessen" variant="ghost" onPress={() => router.push('/(auth)/forgot-password')} />
        </View>
      </Card>

      <Pressable onPress={() => router.push('/(auth)/register')}>
        <AppText style={styles.center}>Noch kein Konto? Registrieren</AppText>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.md
  },
  link: {
    color: colors.primary,
    fontWeight: '800'
  },
  error: {
    color: colors.danger
  },
  center: {
    textAlign: 'center',
    color: colors.primary,
    fontWeight: '800'
  }
});
