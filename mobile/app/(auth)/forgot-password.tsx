import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { apiRequest } from '@/api/client';
import { AppHeader } from '@/components/AppHeader';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { useTranslation } from '@/i18n/I18nContext';
import { spacing } from '@/theme/tokens';
import { useThemeColors } from '@/theme/ThemeContext';

export default function ForgotPasswordScreen() {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const styles = useMemo(() => StyleSheet.create({
    form: { gap: spacing.md },
    link: { color: colors.primary, fontWeight: '800' },
    error: { color: colors.danger }
  }), [colors]);
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
      setError(t('forgot.emailRequired'));
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
      setError(err instanceof Error ? err.message : t('forgot.requestFailed'));
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword() {
    setError('');
    if (!code || password.length < 6) {
      setError(t('forgot.resetRequired'));
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
      setError(err instanceof Error ? err.message : t('forgot.resetFailed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <AppHeader
        title={t('forgot.title')}
        subtitle={step === 'email' ? t('forgot.subtitleEmail') : t('forgot.subtitleReset')}
        eyebrow={t('forgot.eyebrow')}
        icon="key"
        back
      />

      {step === 'email' ? (
        <Card tone="soft">
          <View style={styles.form}>
            <TextField label={t('auth.email')} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
            {error ? <AppText variant="small" style={styles.error}>{error}</AppText> : null}
            <Button title={t('forgot.requestCode')} icon="paper-plane" loading={loading} onPress={requestCode} />
          </View>
        </Card>
      ) : (
        <Card tone="soft">
          <View style={styles.form}>
            {info ? <AppText variant="muted">{info}</AppText> : null}
            <TextField label={t('forgot.code')} value={code} onChangeText={setCode} keyboardType="number-pad" />
            <TextField label={t('forgot.newPassword')} value={password} onChangeText={setPassword} secureTextEntry />
            {error ? <AppText variant="small" style={styles.error}>{error}</AppText> : null}
            <Button title={t('forgot.setPassword')} icon="key" loading={loading} onPress={resetPassword} />
            <Pressable onPress={requestCode}>
              <AppText variant="small" style={styles.link}>{t('forgot.resend')}</AppText>
            </Pressable>
          </View>
        </Card>
      )}

      <Button title={t('forgot.backToLogin')} variant="ghost" icon="chevron-left" onPress={() => router.back()} />
    </Screen>
  );
}
