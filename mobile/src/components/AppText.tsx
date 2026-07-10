import { PropsWithChildren } from 'react';
import { StyleSheet, Text, TextProps } from 'react-native';
import { colors, type } from '@/theme/tokens';

type AppTextProps = PropsWithChildren<TextProps & {
  variant?: 'title' | 'h1' | 'h2' | 'body' | 'small' | 'tiny' | 'muted';
}>;

export function AppText({ children, variant = 'body', style, ...props }: AppTextProps) {
  return <Text {...props} style={[styles.base, styles[variant], style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  base: {
    color: colors.text
  },
  title: {
    fontSize: type.title,
    fontWeight: '900',
    lineHeight: 42
  },
  h1: {
    fontSize: type.h1,
    fontWeight: '900',
    lineHeight: 36
  },
  h2: {
    fontSize: type.h2,
    fontWeight: '700',
    lineHeight: 26
  },
  body: {
    fontSize: type.body,
    lineHeight: 23
  },
  small: {
    fontSize: type.small,
    lineHeight: 19
  },
  tiny: {
    fontSize: type.tiny,
    lineHeight: 16
  },
  muted: {
    fontSize: type.body,
    lineHeight: 23,
    color: colors.textMuted
  }
});
