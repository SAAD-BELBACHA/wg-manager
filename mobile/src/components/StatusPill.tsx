import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { colors, radii, spacing } from '@/theme/tokens';

type StatusPillProps = {
  label: string;
  tone?: 'primary' | 'lime' | 'coral' | 'aqua';
};

const toneStyles = {
  primary: { bg: colors.primarySoft, fg: colors.primary },
  lime: { bg: colors.limeSoft, fg: colors.text },
  coral: { bg: colors.coralSoft, fg: colors.coral },
  aqua: { bg: colors.aquaSoft, fg: colors.text }
};

export function StatusPill({ label, tone = 'primary' }: StatusPillProps) {
  const toneStyle = toneStyles[tone];
  return (
    <View style={[styles.pill, { backgroundColor: toneStyle.bg }]}>
      <AppText variant="tiny" style={[styles.text, { color: toneStyle.fg }]}>{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs
  },
  text: {
    fontWeight: '900'
  }
});
