import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { colors } from '@/theme/tokens';

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
};

export function SectionHeader({ title, subtitle }: SectionHeaderProps) {
  return (
    <View style={styles.wrap}>
      <AppText variant="h2">{title}</AppText>
      {subtitle ? <AppText variant="small" style={styles.subtitle}>{subtitle}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 2
  },
  subtitle: {
    color: colors.textMuted
  }
});
