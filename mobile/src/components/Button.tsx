import { FontAwesome6 } from '@expo/vector-icons';
import { ComponentProps, useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { AppText } from '@/components/AppText';
import { radii, spacing } from '@/theme/tokens';
import { useThemeColors } from '@/theme/ThemeContext';

type ButtonProps = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: ComponentProps<typeof FontAwesome6>['name'];
  style?: ViewStyle;
};

export function Button({ title, onPress, loading, variant = 'primary', icon, style }: ButtonProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => StyleSheet.create({
    base: {
      minHeight: 52,
      borderRadius: radii.pill,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xl
    },
    primary: {
      backgroundColor: colors.primary
    },
    secondary: {
      backgroundColor: colors.primarySoft
    },
    ghost: {
      backgroundColor: 'transparent'
    },
    danger: {
      backgroundColor: colors.error
    },
    pressed: {
      opacity: 0.84,
      transform: [{ scale: 0.98 }]
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm
    },
    text: {
      fontWeight: '900'
    }
  }), [colors]);
  const textColor = variant === 'primary' || variant === 'danger' ? colors.surface : colors.primary;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && styles.pressed,
        style
      ]}
    >
      {loading ? <ActivityIndicator color={variant === 'primary' ? colors.surface : colors.primary} /> : (
        <View style={styles.content}>
          {icon ? <FontAwesome6 name={icon} size={16} color={textColor} /> : null}
          <AppText style={[styles.text, { color: textColor }]}>{title}</AppText>
        </View>
      )}
    </Pressable>
  );
}
