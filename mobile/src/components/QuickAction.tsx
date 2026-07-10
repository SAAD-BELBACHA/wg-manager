import * as Haptics from 'expo-haptics';
import { FontAwesome6 } from '@expo/vector-icons';
import { ComponentProps } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { AppText } from '@/components/AppText';
import { colors, radii, spacing } from '@/theme/tokens';

type QuickActionProps = {
  label: string;
  icon: ComponentProps<typeof FontAwesome6>['name'];
  tone?: 'primary' | 'lime' | 'coral' | 'aqua';
  onPress: () => void;
};

const toneStyles = {
  primary: { bg: colors.primarySoft, fg: colors.primary },
  lime: { bg: colors.limeSoft, fg: colors.text },
  coral: { bg: colors.coralSoft, fg: colors.coral },
  aqua: { bg: colors.aquaSoft, fg: colors.text }
};

export function QuickAction({ label, icon, tone = 'primary', onPress }: QuickActionProps) {
  const toneStyle = toneStyles[tone];

  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      style={({ pressed }) => [styles.action, { backgroundColor: toneStyle.bg }, pressed && styles.pressed]}
    >
      <FontAwesome6 name={icon} size={21} color={toneStyle.fg} />
      <AppText variant="small" style={styles.label}>{label}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  action: {
    minWidth: 92,
    flex: 1,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: spacing.sm,
    alignItems: 'center'
  },
  pressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9
  },
  label: {
    fontWeight: '900',
    textAlign: 'center'
  }
});
