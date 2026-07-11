import { FontAwesome6 } from '@expo/vector-icons';
import { ComponentProps, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { radii, spacing } from '@/theme/tokens';
import { useThemeColors } from '@/theme/ThemeContext';

type EmptyStateProps = {
  title: string;
  body: string;
  icon?: ComponentProps<typeof FontAwesome6>['name'];
  tone?: 'primary' | 'lime' | 'coral' | 'aqua';
};

export function EmptyState({ title, body, icon = 'sparkles', tone = 'primary' }: EmptyStateProps) {
  const colors = useThemeColors();
  const tones = useMemo(() => ({
    primary: { bg: colors.primarySoft, fg: colors.primary },
    lime: { bg: colors.limeSoft, fg: colors.text },
    coral: { bg: colors.coralSoft, fg: colors.coral },
    aqua: { bg: colors.aquaSoft, fg: colors.text }
  }), [colors]);
  const styles = useMemo(() => StyleSheet.create({
    wrap: {
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.xl
    },
    icon: {
      width: 58,
      height: 58,
      borderRadius: radii.lg,
      alignItems: 'center',
      justifyContent: 'center'
    },
    copy: {
      gap: spacing.xs,
      alignItems: 'center'
    },
    title: {
      fontWeight: '900',
      textAlign: 'center'
    },
    body: {
      color: colors.textMuted,
      textAlign: 'center'
    }
  }), [colors]);
  const toneStyle = tones[tone];

  return (
    <View style={styles.wrap}>
      <View style={[styles.icon, { backgroundColor: toneStyle.bg }]}>
        <FontAwesome6 name={icon} size={22} color={toneStyle.fg} />
      </View>
      <View style={styles.copy}>
        <AppText style={styles.title}>{title}</AppText>
        <AppText variant="small" style={styles.body}>{body}</AppText>
      </View>
    </View>
  );
}
