import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { useThemeColors } from '@/theme/ThemeContext';

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
};

export function SectionHeader({ title, subtitle }: SectionHeaderProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => StyleSheet.create({
    wrap: {
      gap: 2
    },
    subtitle: {
      color: colors.textMuted
    }
  }), [colors]);

  return (
    <View style={styles.wrap}>
      <AppText variant="h2">{title}</AppText>
      {subtitle ? <AppText variant="small" style={styles.subtitle}>{subtitle}</AppText> : null}
    </View>
  );
}
