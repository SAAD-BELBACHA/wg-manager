import { PropsWithChildren, useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { spacing } from '@/theme/tokens';
import { useThemeColors } from '@/theme/ThemeContext';

type ScreenProps = PropsWithChildren<{
  scroll?: boolean;
}>;

export function Screen({ children, scroll = true }: ScreenProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.background
    },
    content: {
      flexGrow: 1,
      padding: spacing.xl,
      gap: spacing.lg
    }
  }), [colors]);
  const content = <View style={styles.content}>{children}</View>;

  return (
    <SafeAreaView style={styles.safe}>
      {scroll ? <ScrollView keyboardShouldPersistTaps="handled">{content}</ScrollView> : content}
    </SafeAreaView>
  );
}
