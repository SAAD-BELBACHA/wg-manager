import { FontAwesome6 } from '@expo/vector-icons';
import { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { colors, radii, spacing } from '@/theme/tokens';

type FeatureTileProps = {
  title: string;
  subtitle: string;
  icon?: ComponentProps<typeof FontAwesome6>['name'];
  tone?: 'primary' | 'lime' | 'coral' | 'aqua';
  onPress: () => void;
};

const tones = {
  primary: { bg: colors.primarySoft, fg: colors.primary },
  lime: { bg: colors.limeSoft, fg: colors.text },
  coral: { bg: colors.coralSoft, fg: colors.coral },
  aqua: { bg: colors.aquaSoft, fg: colors.text }
};

export function FeatureTile({ title, subtitle, icon = 'arrow-right', tone = 'primary', onPress }: FeatureTileProps) {
  const toneStyle = tones[tone];
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.tile, pressed && styles.pressed]}>
      <View style={[styles.icon, { backgroundColor: toneStyle.bg }]}>
        <FontAwesome6 name={icon} size={17} color={toneStyle.fg} />
      </View>
      <View style={styles.copy}>
        <AppText style={styles.title}>{title}</AppText>
        <AppText variant="small" style={styles.subtitle}>{subtitle}</AppText>
      </View>
      <FontAwesome6 name="chevron-right" size={14} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border
  },
  pressed: {
    opacity: 0.84,
    transform: [{ scale: 0.99 }]
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  copy: {
    flex: 1,
    gap: spacing.xs
  },
  title: {
    fontWeight: '900'
  },
  subtitle: {
    color: colors.textMuted
  }
});
