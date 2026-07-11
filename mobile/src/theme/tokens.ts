export const colors = {
  backgroundLight: '#F6F3ED',
  backgroundDark: '#18171F',
  surfaceLight: '#FFFFFF',
  surfaceDark: '#24222C',
  primary: '#665CFF',
  primarySoft: '#ECEAFF',
  lime: '#C9F45D',
  limeSoft: '#F1FFD0',
  coral: '#FF6B6B',
  coralSoft: '#FFE9E9',
  aqua: '#57DDE0',
  aquaSoft: '#DDFBFC',
  textPrimaryLight: '#1D1B22',
  textSecondaryLight: '#77727D',
  textPrimaryDark: '#F7F5FA',
  textSecondaryDark: '#AAA5B1',
  success: '#48A878',
  warning: '#F2AE40',
  error: '#E95656',
  borderLight: '#E9E2D8',
  borderDark: '#34313E',
  shadow: '#18171F',
  background: '#F6F3ED',
  surface: '#FFFFFF',
  surfaceMuted: '#EFEAE1',
  text: '#1D1B22',
  textMuted: '#77727D',
  danger: '#E95656',
  border: '#E9E2D8'
};

export function buildColors(theme: 'light' | 'dark') {
  const dark = theme === 'dark';
  return {
    background: dark ? colors.backgroundDark : colors.backgroundLight,
    surface: dark ? colors.surfaceDark : colors.surfaceLight,
    surfaceMuted: dark ? '#2C2A35' : colors.surfaceMuted,
    primary: colors.primary,
    primarySoft: dark ? '#2C2952' : colors.primarySoft,
    lime: colors.lime,
    limeSoft: dark ? '#2B3512' : colors.limeSoft,
    coral: colors.coral,
    coralSoft: dark ? '#3A2323' : colors.coralSoft,
    aqua: colors.aqua,
    aquaSoft: dark ? '#173538' : colors.aquaSoft,
    text: dark ? colors.textPrimaryDark : colors.textPrimaryLight,
    textMuted: dark ? colors.textSecondaryDark : colors.textSecondaryLight,
    success: colors.success,
    warning: colors.warning,
    error: colors.error,
    danger: colors.error,
    border: dark ? colors.borderDark : colors.borderLight,
    shadow: colors.shadow
  };
}

export type ThemeColors = ReturnType<typeof buildColors>;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32
};

export const radii = {
  sm: 12,
  md: 16,
  lg: 22,
  hero: 28,
  pill: 999
};

export const type = {
  title: 36,
  h1: 30,
  h2: 21,
  body: 16,
  small: 14,
  tiny: 12
};

export const shadows = {
  card: {
    shadowColor: colors.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4
  },
  hero: {
    shadowColor: colors.primary,
    shadowOpacity: 0.22,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 14 },
    elevation: 8
  }
};

export const motion = {
  pressScale: 0.97,
  fast: 140,
  normal: 220
};
