import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { radii, spacing } from '@/theme/tokens';
import { useThemeColors } from '@/theme/ThemeContext';

export function Badge({ label }: { label: string }) {
  const colors = useThemeColors();
  const styles = useMemo(() => StyleSheet.create({
    badge: {
      alignSelf: 'flex-start',
      borderRadius: radii.pill,
      backgroundColor: colors.primarySoft,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs
    },
    text: {
      color: colors.primary,
      fontWeight: '800'
    }
  }), [colors]);

  return (
    <View style={styles.badge}>
      <AppText variant="small" style={styles.text}>{label}</AppText>
    </View>
  );
}
