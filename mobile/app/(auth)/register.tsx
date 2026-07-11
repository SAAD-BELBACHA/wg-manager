import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppHeader } from '@/components/AppHeader';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { useAuth } from '@/auth/AuthContext';
import { useTranslation } from '@/i18n/I18nContext';
import { spacing } from '@/theme/tokens';
import { useThemeColors } from '@/theme/ThemeContext';

export default function RegisterScreen() {
  const { register } = useAuth();
  const colors = useThemeColors();
  const { t } = useTranslation();
  const styles = useMemo(() => StyleSheet.create({
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
  }), [colors]);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    setError('');
    if (!username || !email || password.length < 6) {
      setError(t('auth.registerRequired'));
      return;
    }

    setLoading(true);
    try {
      await register(username, email, password);
      router.replace('/(auth)/wg-setup');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.registerFailed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <AppHeader title={t('auth.registerTitle')} subtitle={t('auth.registerSubtitle')} eyebrow={t('auth.registerEyebrow')} icon="user-plus" back />

      <Card tone="soft">
        <View style={styles.form}>
          <TextField label={t('auth.name')} value={username} onChangeText={setUsername} />
          <TextField label={t('auth.email')} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <TextField label={t('auth.password')} value={password} onChangeText={setPassword} secureTextEntry={!showPassword} />
          <Pressable onPress={() => setShowPassword(value => !value)}>
            <AppText variant="small" style={styles.link}>{showPassword ? t('auth.hidePassword') : t('auth.showPassword')}</AppText>
          </Pressable>
          {error ? <AppText variant="small" style={styles.error}>{error}</AppText> : null}
          <Button title={t('auth.registerButton')} icon="user-plus" loading={loading} onPress={submit} />
        </View>
      </Card>

      <Pressable onPress={() => router.push('/(auth)/login')}>
        <AppText style={styles.center}>{t('auth.hasAccount')}</AppText>
      </Pressable>
    </Screen>
  );
}
