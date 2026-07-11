import { LinearGradient } from 'expo-linear-gradient';
import { PropsWithChildren, useMemo } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { radii, shadows, spacing } from '@/theme/tokens';
import { useThemeColors } from '@/theme/ThemeContext';

type HeroCardProps = PropsWithChildren<{
  style?: ViewStyle;
  accent?: 'primary' | 'lime' | 'coral' | 'aqua';
}>;

export function HeroCard({ children, style, accent = 'primary' }: HeroCardProps) {
  const colors = useThemeColors();
  const gradients = useMemo(() => ({
    primary: [colors.primary, '#847DFF'] as const,
    lime: [colors.lime, '#E9FF9C'] as const,
    coral: [colors.coral, '#FF9A8A'] as const,
    aqua: [colors.aqua, '#9EF0EA'] as const
  }), [colors]);
  const styles = useMemo(() => StyleSheet.create({
    hero: {
      borderRadius: radii.hero,
      padding: spacing.xl,
      gap: spacing.md,
      ...shadows.hero
    }
  }), []);

  return (
    <LinearGradient colors={gradients[accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, style]}>
      {children}
    </LinearGradient>
  );
}
