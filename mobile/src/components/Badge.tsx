import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { colors, radii, spacing } from '@/theme/tokens';

export function Badge({ label }: { label: string }) {
  return (
    <View style={styles.badge}>
      <AppText variant="small" style={styles.text}>{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
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
});
