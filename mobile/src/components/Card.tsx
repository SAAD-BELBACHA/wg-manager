import { PropsWithChildren, useMemo } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { radii, shadows, spacing } from '@/theme/tokens';
import { useThemeColors } from '@/theme/ThemeContext';

type CardProps = PropsWithChildren<{
  style?: ViewStyle;
  tone?: 'plain' | 'soft' | 'lime' | 'aqua' | 'coral';
}>;

export function Card({ children, style, tone = 'plain' }: CardProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
      gap: spacing.md,
      ...shadows.card
    },
    plain: {},
    soft: {
      backgroundColor: colors.surfaceMuted,
      shadowOpacity: 0
    },
    lime: {
      backgroundColor: colors.limeSoft,
      borderColor: '#E0F7A3'
    },
    aqua: {
      backgroundColor: colors.aquaSoft,
      borderColor: '#B8EFF0'
    },
    coral: {
      backgroundColor: colors.coralSoft,
      borderColor: '#FFD2D2'
    }
  }), [colors]);

  return <View style={[styles.card, styles[tone], style]}>{children}</View>;
}
