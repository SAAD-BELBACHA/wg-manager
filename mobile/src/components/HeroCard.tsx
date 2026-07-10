import { LinearGradient } from 'expo-linear-gradient';
import { PropsWithChildren } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { colors, radii, shadows, spacing } from '@/theme/tokens';

type HeroCardProps = PropsWithChildren<{
  style?: ViewStyle;
  accent?: 'primary' | 'lime' | 'coral' | 'aqua';
}>;

const gradients = {
  primary: [colors.primary, '#847DFF'] as const,
  lime: [colors.lime, '#E9FF9C'] as const,
  coral: [colors.coral, '#FF9A8A'] as const,
  aqua: [colors.aqua, '#9EF0EA'] as const
};

export function HeroCard({ children, style, accent = 'primary' }: HeroCardProps) {
  return (
    <LinearGradient colors={gradients[accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, style]}>
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: radii.hero,
    padding: spacing.xl,
    gap: spacing.md,
    ...shadows.hero
  }
});
