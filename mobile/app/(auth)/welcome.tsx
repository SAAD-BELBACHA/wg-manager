import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { HeroCard } from '@/components/HeroCard';
import { Screen } from '@/components/Screen';
import { de } from '@/i18n/de';
import { colors, spacing } from '@/theme/tokens';

export default function WelcomeScreen() {
  return (
    <Screen scroll={false}>
      <View style={styles.heroWrap}>
        <View style={styles.mark}>
          <AppText variant="title" style={styles.markText}>Z</AppText>
        </View>
        <AppText variant="title">Zofri</AppText>
        <AppText variant="muted">{de.welcomeBody}</AppText>
      </View>

      <HeroCard accent="primary">
        <AppText variant="h1" style={styles.heroTitle}>{de.welcomeTitle}</AppText>
        <AppText style={styles.heroCopy}>WG organisieren, ohne dass es sich nach Büro anfühlt.</AppText>
        <View style={styles.actions}>
          <Button title={de.login} icon="right-to-bracket" onPress={() => router.push('/(auth)/login')} />
          <Button title={de.register} variant="secondary" onPress={() => router.push('/(auth)/register')} />
        </View>
      </HeroCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroWrap: {
    flex: 1,
    justifyContent: 'center',
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
});
