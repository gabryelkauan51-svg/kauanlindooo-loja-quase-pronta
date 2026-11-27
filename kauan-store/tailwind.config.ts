import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0B0D10',
        card: '#0F1115',
        line: '#1C1C26',
        brand: { DEFAULT: '#7C5CE6', light: '#A394F0' },
        pix: { DEFAULT: '#2E9E78', dark: '#258566' },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        display: ['"Chakra Petch"', '"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(163, 148, 240, 0.28)',
      },
    },
  },
  plugins: [],
} satisfies Config;
