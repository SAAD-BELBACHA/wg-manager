import { FontAwesome6 } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { useTranslation } from '@/i18n/I18nContext';
import { markOnboardingSeen } from '@/onboarding';
import { spacing } from '@/theme/tokens';
import { useThemeColors } from '@/theme/ThemeContext';

type Slide = { icon: string; title: string; body: string };

export default function OnboardingScreen() {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);

  const slides: Slide[] = [
    { icon: 'house-chimney', title: t('onboarding.slides.welcomeTitle'), body: t('onboarding.slides.welcomeBody') },
    { icon: 'user-plus', title: t('onboarding.slides.step1Title'), body: t('onboarding.slides.step1Body') },
    { icon: 'people-roof', title: t('onboarding.slides.step2Title'), body: t('onboarding.slides.step2Body') },
    { icon: 'wand-magic-sparkles', title: t('onboarding.slides.step3Title'), body: t('onboarding.slides.step3Body') }
  ];
  const isLast = index === slides.length - 1;
  const slide = slides[index];

  const styles = useMemo(() => StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    top: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
    skip: { padding: spacing.sm },
    skipText: { color: colors.textMuted, fontWeight: '700' },
    body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl, gap: spacing.lg },
    iconWrap: { width: 108, height: 108, borderRadius: 32, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
    title: { textAlign: 'center' },
    text: { textAlign: 'center', maxWidth: 340 },
    dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingVertical: spacing.lg },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
    dotActive: { width: 22, backgroundColor: colors.primary },
    footer: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, gap: spacing.md }
  }), [colors]);

  const finish = async (href: '/(auth)/register' | '/(auth)/login') => {
    await markOnboardingSeen();
    router.replace(href);
  };

  const goNext = () => {
    if (isLast) return finish('/(auth)/register');
    setIndex(i => Math.min(i + 1, slides.length - 1));
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.top}>
        <Pressable style={styles.skip} onPress={() => finish('/(auth)/register')} accessibilityRole="button">
          <AppText style={styles.skipText}>{t('onboarding.skip')}</AppText>
        </Pressable>
      </View>

      <View style={styles.body}>
        <View style={styles.iconWrap}>
          <FontAwesome6 name={slide.icon as never} size={44} color={colors.primary} />
        </View>
        <AppText variant="title" style={styles.title}>{slide.title}</AppText>
        <AppText variant="muted" style={styles.text}>{slide.body}</AppText>
      </View>

      <View style={styles.dots}>
        {slides.map((_, i) => (
          <Pressable key={i} onPress={() => setIndex(i)} accessibilityRole="button">
            <View style={[styles.dot, i === index && styles.dotActive]} />
          </Pressable>
        ))}
      </View>

      <View style={styles.footer}>
        <Button
          title={isLast ? t('onboarding.start') : t('onboarding.next')}
          icon={isLast ? 'arrow-right-to-bracket' : 'arrow-right'}
          onPress={goNext}
        />
        {isLast && (
          <Button title={t('onboarding.haveAccount')} variant="ghost" onPress={() => finish('/(auth)/login')} />
        )}
      </View>
    </SafeAreaView>
  );
}
