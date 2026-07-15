import { MD3LightTheme } from 'react-native-paper';

export const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#04243b',        // Deep navy from background
    primaryContainer: '#ffff1a', // Bright yellow container
    secondary: '#ff9c1d',      // Orange accent
    secondaryContainer: '#ffffcc', // Soft yellow container
    background: '#ffffff',     // White background
    surface: '#ffffff',        // White surface
    surfaceVariant: '#dadada', // Light gray border tone
    error: '#ef4444',          // Keep your red error
    success: '#10b981',        // Emerald success
    warning: '#f59e0b',        // Amber warning
    textPrimary: '#000000',    // Black textr
    textSecondary: '#6d6d6d',  // Gray text
    textInverse: '#ffffff',    // White text
  },
  fonts: {
    ...MD3LightTheme.fonts,
    bodySmall:   { ...MD3LightTheme.fonts.bodySmall,   fontFamily: 'montserrat', fontWeight: "bold" },
    bodyMedium:  { ...MD3LightTheme.fonts.bodyMedium,  fontFamily: 'montserrat', fontWeight: "bold" },
    bodyLarge:   { ...MD3LightTheme.fonts.bodyLarge,   fontFamily: 'montserrat', fontWeight: "bold" },
    titleSmall:  { ...MD3LightTheme.fonts.titleSmall,  fontFamily: 'montserrat', fontWeight: "bold" },
    titleMedium: { ...MD3LightTheme.fonts.titleMedium, fontFamily: 'montserrat', fontWeight: "bold" },
    titleLarge:  { ...MD3LightTheme.fonts.titleLarge,  fontFamily: 'montserrat', fontWeight: "bold" },
    labelSmall:  { ...MD3LightTheme.fonts.labelSmall,  fontFamily: 'montserrat', fontWeight: "bold" },
    labelMedium: { ...MD3LightTheme.fonts.labelMedium, fontFamily: 'montserrat', fontWeight: "bold" },
    labelLarge:  { ...MD3LightTheme.fonts.labelLarge,  fontFamily: 'montserrat', fontWeight: "bold" },
    displaySmall:{ ...MD3LightTheme.fonts.displaySmall,fontFamily: 'montserrat', fontWeight: "bold" },
    displayMedium:{...MD3LightTheme.fonts.displayMedium,fontFamily: 'montserrat', fontWeight: "bold" },
    displayLarge:{...MD3LightTheme.fonts.displayLarge,fontFamily: 'montserrat', fontWeight: "bold" },
  },
};

export type AppTheme = typeof theme;
