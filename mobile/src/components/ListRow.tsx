import { FontAwesome6 } from '@expo/vector-icons';
import { ComponentProps, PropsWithChildren, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { radii, spacing } from '@/theme/tokens';
import { useThemeColors } from '@/theme/ThemeContext';

type ListRowProps = PropsWithChildren<{
  title: string;
  subtitle?: string;
  icon?: ComponentProps<typeof FontAwesome6>['name'];
  checked?: boolean;
  muted?: boolean;
  actionLabel?: string;
  onPress?: () => void;
  onAction?: () => void;
}>;

export function ListRow({ title, subtitle, icon, checked, muted, actionLabel, onPress, onAction, children }: ListRowProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border
    },
    pressed: {
      opacity: 0.84
    },
    icon: {
      width: 36,
      height: 36,
      borderRadius: radii.pill,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center'
    },
    iconChecked: {
      backgroundColor: colors.success
    },
    copy: {
      flex: 1,
      gap: 2
    },
    title: {
      fontWeight: '800'
    },
    mutedText: {
      textDecorationLine: 'line-through',
      color: colors.textMuted
    },
    subtitle: {
      color: colors.textMuted
    },
    action: {
      borderRadius: radii.pill,
      backgroundColor: colors.coralSoft,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md
    },
    actionText: {
      color: colors.coral,
      fontWeight: '900'
    }
  }), [colors]);

  const content = (
    <>
      <View style={[styles.icon, checked && styles.iconChecked]}>
        <FontAwesome6 name={checked ? 'check' : icon || 'circle'} size={checked ? 15 : 12} color={checked ? colors.surface : colors.primary} />
      </View>
      <View style={styles.copy}>
        <AppText style={[styles.title, muted && styles.mutedText]}>{title}</AppText>
        {subtitle ? <AppText variant="small" style={styles.subtitle}>{subtitle}</AppText> : null}
        {children}
      </View>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} style={styles.action}>
          <AppText variant="tiny" style={styles.actionText}>{actionLabel}</AppText>
        </Pressable>
      ) : null}
    </>
  );

  if (onPress) {
    return <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>{content}</Pressable>;
  }
  return <View style={styles.row}>{content}</View>;
}
