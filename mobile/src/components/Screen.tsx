import { PropsWithChildren, useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '@/theme/tokens';
import { useThemeColors } from '@/theme/ThemeContext';

type ScreenProps = PropsWithChildren<{
  scroll?: boolean;
}>;

// Keep content readable and centered on wide (web / tablet) viewports
// instead of stretching edge-to-edge.
const MAX_CONTENT_WIDTH = 520;

export function Screen({ children, scroll = true }: ScreenProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  // Generous bottom padding so the last button always clears the home
  // indicator / browser chrome and stays comfortably tappable.
  const bottomPad = spacing.xl + insets.bottom + spacing.xl;
  const styles = useMemo(() => StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.background
    },
    outer: {
      flexGrow: 1,
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.xl,
      paddingBottom: bottomPad
    },
    inner: {
      width: '100%',
      maxWidth: MAX_CONTENT_WIDTH,
      flexGrow: 1,
      gap: spacing.lg
    }
  }), [colors, bottomPad]);

  const body = <View style={styles.inner}>{children}</View>;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.outer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {body}
        </ScrollView>
      ) : (
        <View style={styles.outer}>{body}</View>
      )}
    </SafeAreaView>
  );
}
