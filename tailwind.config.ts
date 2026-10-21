import type { Config } from 'tailwindcss'
import forms from '@tailwindcss/forms'

/**
 * Vita's palette is deliberately *semantic*, not decorative.
 *
 * The four bars ("motives") each own a hue so the home screen is readable at a
 * glance, one-handed, in a kitchen. Design review retunes these tokens here —
 * never by sprinkling hex codes through components.
 */
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // The win state: all four bars filled = a "green day".
        greenday: {
          light: '#d1fae5',
          DEFAULT: '#10b981',
          dark: '#047857',
        },
        // One hue per bar.
        fuel: { light: '#fef3c7', DEFAULT: '#f59e0b', dark: '#b45309' },
        protein: { light: '#ffe4e6', DEFAULT: '#f43f5e', dark: '#be123c' },
        training: { light: '#ede9fe', DEFAULT: '#8b5cf6', dark: '#6d28d9' },
        recovery: { light: '#e0f2fe', DEFAULT: '#0ea5e9', dark: '#0369a1' },
      },
    },
  },
  plugins: [forms],
}

export default config
