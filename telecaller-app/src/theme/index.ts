/**
 * VoiceBridge Monochrome Theme
 * Pure black/white/gray — clean, professional, editorial.
 */

// Monochrome Palette — every "color" maps to a gray scale value
export const colors = {
  // Primary — black accent
  primary: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#E5E5E5',
    300: '#D4D4D4',
    400: '#A3A3A3',
    500: '#171717', // Main primary — near-black
    600: '#0A0A0A',
    700: '#000000',
    800: '#000000',
    900: '#000000',
  },

  // Secondary — same monochrome scale
  secondary: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#E5E5E5',
    300: '#D4D4D4',
    400: '#A3A3A3',
    500: '#525252',
    600: '#404040',
    700: '#262626',
    800: '#171717',
    900: '#0A0A0A',
  },

  // Success — dark gray (no green)
  success: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    400: '#525252',
    500: '#262626',
    600: '#171717',
    700: '#0A0A0A',
  },

  // Warning — mid gray (no orange)
  warning: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    400: '#737373',
    500: '#525252',
    600: '#404040',
    700: '#262626',
  },

  // Error — near-black (no red)
  error: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    400: '#525252',
    500: '#262626',
    600: '#171717',
    700: '#0A0A0A',
  },

  // Neutral — clean grays (unchanged)
  neutral: {
    0: '#FFFFFF',
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#E5E5E5',
    300: '#D4D4D4',
    400: '#A3A3A3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
  },

  // Status — all monochrome variations
  status: {
    new: '#171717',
    interested: '#262626',
    notInterested: '#737373',
    noAnswer: '#A3A3A3',
    callback: '#525252',
    converted: '#0A0A0A',
  },

  // Backgrounds
  background: {
    primary: '#FFFFFF',
    secondary: '#FAFAFA',
    tertiary: '#F5F5F5',
    card: '#FFFFFF',
  },

  // Text
  text: {
    primary: '#0A0A0A',
    secondary: '#525252',
    tertiary: '#A3A3A3',
    inverse: '#FFFFFF',
  },

  // Borders
  border: {
    light: '#E8E8E8',
    medium: '#D4D4D4',
  },
};

// Typography
export const typography = {
  fontSize: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 20,
    xl: 24,
    '2xl': 28,
    '3xl': 34,
  },
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semiBold: '600' as const,
    bold: '700' as const,
  },
};

// Spacing
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
};

// Border Radius — squarer for editorial feel
export const borderRadius = {
  sm: 2,
  md: 4,
  base: 6,
  lg: 8,
  xl: 10,
  full: 9999,
};

// Shadows — subtle, monochrome
export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  colored: (_color: string) => ({
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  }),
};

export default { colors, typography, spacing, borderRadius, shadows };
