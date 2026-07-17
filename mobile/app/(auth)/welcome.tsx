import { router } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { HeroCard } from '@/components/HeroCard';
import { Screen } from '@/components/Screen';
import { useTranslation } from '@/i18n/I18nContext';
import { spacing } from '@/theme/tokens';
import { useThemeColors } from '@/theme/ThemeContext';

export default function WelcomeScreen() {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const styles = useMemo(() => StyleSheet.create({
    heroWrap: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: spacing.lg
    },
    mark: {
      width: 76,
      height: 76,
      borderRadius: 24,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center'
    },
    markText: {
      color: colors.surface
    },
    centerText: {
      textAlign: 'center'
    },
    heroTitle: {
      color: colors.surface
    },
    heroCopy: {
      color: 'rgba(255,255,255,0.86)',
      fontWeight: '700'
    },
    actions: {
      gap: spacing.md
    }
  }), [colors]);

  return (
    <Screen>
      <View style={styles.heroWrap}>
        <View style={styles.mark}>
          <AppText variant="title" style={styles.markText}>Z</AppText>
        </View>
        <AppText variant="title" style={styles.centerText}>Zofri</AppText>
        <AppText variant="muted" style={styles.centerText}>{t('welcome.tagline')}</AppText>
      </View>

      <HeroCard accent="primary">
        <AppText variant="h1" style={styles.heroTitle}>{t('welcome.heroTitle')}</AppText>
        <AppText style={styles.heroCopy}>{t('welcome.heroBody')}</AppText>
        <View style={styles.actions}>
          <Button title={t('welcome.login')} icon="right-to-bracket" onPress={() => router.push('/(auth)/login')} />
          <Button title={t('welcome.register')} variant="secondary" onPress={() => router.push('/(auth)/register')} />
        </View>
      </HeroCard>
    </Screen>
  );
}
