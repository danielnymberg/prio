/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Claude AI-inspired minimalist palette
        // Light mode - warm whites and soft grays
        'cream': {
          50: '#FEFDFB',
          100: '#FAFAF8',
          200: '#F5F5F3',
        },
        'sand': {
          100: '#F0EDE8',
          200: '#E5E1DB',
          300: '#D4CFC7',
        },
        'stone': {
          400: '#9D968D',
          500: '#7C766D',
          600: '#5C564D',
          700: '#3C362D',
        },
        // Dark mode - warm blacks and grays
        'charcoal': {
          800: '#2A2520',
          850: '#221F1B',
          900: '#1A1816',
          950: '#121110',
        },
        // Accent - warm amber/copper
        'copper': {
          400: '#F59E42',
          500: '#D97706',
          600: '#B45309',
          700: '#92400E',
        },
        // Status colors - more muted
        'success': {
          light: '#86EFAC',
          DEFAULT: '#22C55E',
          dark: '#166534',
        },
        'warning': {
          light: '#FCD34D',
          DEFAULT: '#F59E0B',
          dark: '#B45309',
        },
        'error': {
          light: '#FCA5A5',
          DEFAULT: '#EF4444',
          dark: '#991B1B',
        },
        // Eisenhower Matrix quadrants - muted versions
        q1: '#E57373', // Important + Urgent (muted red)
        q2: '#4ADE80', // Important + Not Urgent (muted green)
        q3: '#FBBF24', // Not Important + Urgent (muted amber)
        q4: '#9CA3AF', // Not Important + Not Urgent (muted gray)
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Inter', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        'xl': '0.875rem',
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        'soft': '0 2px 8px 0 rgba(0, 0, 0, 0.04)',
        'medium': '0 4px 16px 0 rgba(0, 0, 0, 0.06)',
      },
    },
  },
  plugins: [],
  darkMode: 'class',
}
