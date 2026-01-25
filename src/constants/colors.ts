// Design Guide v1.0 - Modern, Technological, Dynamic
// Primary: Orange (Energy, CTAs) | Secondary: Blue (Time, Info)
export const Colors = {
  light: {
    // Primary Accent - "Energy" (Orange)
    primary: '#FF6B35',
    primaryLight: '#FF8C42',
    primaryDark: '#F77F00',

    // Secondary Accent - "Technology" (Blue)
    secondary: '#0a7ea4',
    secondaryLight: '#06BEE1',
    secondaryDark: '#0077B6',

    // Backgrounds
    background: '#ffffff',
    surface: '#f5f5f5',
    card: '#ffffff',

    // Text & Icons
    text: '#11181C',
    textMuted: '#687076',

    // UI Elements
    border: '#E5E7EB',
    success: '#22C55E',
    error: '#EF4444',
    warning: '#F59E0B',
    notification: '#FF6B35',
  },
  dark: {
    // Primary Accent - "Energy" (Orange)
    primary: '#FF6B35',
    primaryLight: '#FF8C42',
    primaryDark: '#F77F00',

    // Secondary Accent - "Technology" (Blue)
    secondary: '#0a7ea4',
    secondaryLight: '#06BEE1',
    secondaryDark: '#0077B6',

    // Backgrounds
    background: '#151718',      // Primary Dark
    surface: '#1e2022',         // Surface Dark
    card: '#1e2022',

    // Text & Icons
    text: '#ECEDEE',
    textMuted: '#9BA1A6',

    // UI Elements
    border: '#334155',
    success: '#22C55E',
    error: '#EF4444',
    warning: '#F59E0B',
    notification: '#FF6B35',
  },
} as const;
