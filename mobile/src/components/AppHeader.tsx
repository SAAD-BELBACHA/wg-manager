import { FontAwesome6 } from '@expo/vector-icons';
import { ComponentProps, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { AppText } from '@/components/AppText';
import { StatusPill } from '@/components/StatusPill';
import { spacing } from '@/theme/tokens';
import { useThemeColors } from '@/theme/ThemeContext';

type AppHeaderProps = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  back?: boolean;
  icon?: ComponentProps<typeof FontAwesome6>['name'];
};

export function AppHeader({ title, subtitle, eyebrow, back, icon }: AppHeaderProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md
    },
    back: {
      width: 42,
      height: 42,
      borderRadius: 16,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center'
    },
    copy: {
      flex: 1,
      gap: spacing.sm
    },
    icon: {
      width: 50,
      height: 50,
      borderRadius: 18,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center'
    }
  }), [colors]);

  return (
    <View style={styles.header}>
      {back ? (
        <Pressable onPress={() => router.back()} style={styles.back}>
          <FontAwesome6 name="chevron-left" size={16} color={colors.primary} />
        </Pressable>
      ) : null}
      <View style={styles.copy}>
        {eyebrow ? <StatusPill label={eyebrow} tone="aqua" /> : null}
        <AppText variant="h1">{title}</AppText>
        {subtitle ? <AppText variant="muted">{subtitle}</AppText> : null}
      </View>
      {icon ? (
        <View style={styles.icon}>
          <FontAwesome6 name={icon} size={22} color={colors.primary} />
        </View>
      ) : null}
    </View>
  );
}
