import { useMemo } from 'react';
import { StyleSheet, TextInput, TextInputProps, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { radii, spacing } from '@/theme/tokens';
import { useThemeColors } from '@/theme/ThemeContext';

type TextFieldProps = TextInputProps & {
  label: string;
  error?: string;
};

export function TextField({ label, error, style, ...props }: TextFieldProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => StyleSheet.create({
    wrap: {
      gap: spacing.xs
    },
    label: {
      color: colors.textMuted,
      fontWeight: '700'
    },
    input: {
      minHeight: 56,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.lg,
      paddingHorizontal: spacing.lg,
      backgroundColor: colors.surface,
      color: colors.text,
      fontSize: 16,
      fontWeight: '600'
    },
    inputError: {
      borderColor: colors.danger
    },
    error: {
      color: colors.danger
    }
  }), [colors]);

  return (
    <View style={styles.wrap}>
      <AppText variant="small" style={styles.label}>{label}</AppText>
      <TextInput
        placeholderTextColor={colors.textMuted}
        style={[styles.input, error && styles.inputError, style]}
        {...props}
      />
      {error ? <AppText variant="small" style={styles.error}>{error}</AppText> : null}
    </View>
  );
}
