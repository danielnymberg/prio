/**
 * Syncfusion Theme System Integration
 * Centralized theme management for all Syncfusion components
 */

// Prio brand colors mapped to Syncfusion CSS variables
export const prioThemeConfig = {
  // Primary colors (Copper/Amber)
  primary: '#f59e0b',
  primaryLighter: '#fbbf24',
  primaryDarker: '#d97706',

  // Surface colors (Light mode)
  surface: '#fafaf9', // cream-50
  surfaceAlt: '#f5f5f4', // stone-100
  surfaceVariant: '#e7e5e4', // stone-200

  // Dark mode surfaces
  darkSurface: '#1c1917', // charcoal-950
  darkSurfaceAlt: '#292524', // charcoal-900
  darkSurfaceVariant: '#44403c', // charcoal-700

  // Text colors
  textPrimary: '#44403c', // stone-700
  textSecondary: '#78716c', // stone-500
  darkTextPrimary: '#e7e5e4', // stone-200
  darkTextSecondary: '#a8a29e', // stone-400

  // Border colors
  border: '#e7e5e4', // stone-200
  darkBorder: '#44403c', // charcoal-700
};

/**
 * Initialize Syncfusion theme system
 * Called once at app startup
 */
export function initializeSyncfusionTheme() {
  // Check if dark mode is active
  const isDark = document.documentElement.classList.contains('dark');

  // Apply initial theme
  applySyncfusionTheme(isDark);

  console.log('✅ Syncfusion theme initialized:', isDark ? 'dark' : 'light');
}

/**
 * Apply Syncfusion theme based on dark mode state
 * Called when user toggles theme
 */
export function applySyncfusionTheme(isDark: boolean) {
  const root = document.documentElement;
  const body = document.body;

  if (isDark) {
    // Dark mode
    root.setAttribute('data-theme', 'prio-dark');
    body.classList.add('e-dark-mode');

    // Apply dark mode CSS variables
    applyCSSVariables(prioThemeConfig, true);
  } else {
    // Light mode
    root.setAttribute('data-theme', 'prio-light');
    body.classList.remove('e-dark-mode');

    // Apply light mode CSS variables
    applyCSSVariables(prioThemeConfig, false);
  }

  console.log('🎨 Syncfusion theme applied:', isDark ? 'dark' : 'light');
}

/**
 * Apply CSS variables to document root
 */
function applyCSSVariables(config: typeof prioThemeConfig, isDark: boolean) {
  const root = document.documentElement;

  // Primary colors (same for both modes)
  root.style.setProperty('--e-primary', config.primary);
  root.style.setProperty('--e-primary-lighter', config.primaryLighter);
  root.style.setProperty('--e-primary-darker', config.primaryDarker);

  if (isDark) {
    // Dark mode colors
    root.style.setProperty('--e-surface', config.darkSurface);
    root.style.setProperty('--e-surface-alt', config.darkSurfaceAlt);
    root.style.setProperty('--e-surface-variant', config.darkSurfaceVariant);
    root.style.setProperty('--e-text-primary', config.darkTextPrimary);
    root.style.setProperty('--e-text-secondary', config.darkTextSecondary);
    root.style.setProperty('--e-border', config.darkBorder);
  } else {
    // Light mode colors
    root.style.setProperty('--e-surface', config.surface);
    root.style.setProperty('--e-surface-alt', config.surfaceAlt);
    root.style.setProperty('--e-surface-variant', config.surfaceVariant);
    root.style.setProperty('--e-text-primary', config.textPrimary);
    root.style.setProperty('--e-text-secondary', config.textSecondary);
    root.style.setProperty('--e-border', config.border);
  }
}
