import { FontAwesome6 } from '@expo/vector-icons';
import { ComponentProps, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { spacing } from '@/theme/tokens';
import { useThemeColors } from '@/theme/ThemeContext';

type MetricCardProps = {
  label: string;
  value: string;
  helper?: string;
  icon: ComponentProps<typeof FontAwesome6>['name'];
  tone?: 'plain' | 'soft' | 'lime' | 'aqua' | 'coral';
};

export function MetricCard({ label, value, helper, icon, tone = 'plain' }: MetricCardProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => StyleSheet.create({
    card: {
      flex: 1,
      minHeight: 132
    },
    top: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm
    },
    label: {
      color: colors.textMuted,
      fontWeight: '900'
    },
    helper: {
      color: colors.textMuted,
      fontWeight: '700'
    }
  }), [colors]);

  return (
    <Card tone={tone} style={styles.card}>
      <View style={styles.top}>
        <AppText variant="small" style={styles.label}>{label}</AppText>
        <FontAwesome6 name={icon} size={17} color={colors.primary} />
      </View>
      <AppText variant="h2">{value}</AppText>
      {helper ? <AppText variant="tiny" style={styles.helper}>{helper}</AppText> : null}
    </Card>
  );
}
