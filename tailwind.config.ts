import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Keep the utility classes already used across the storefront and admin
        // aligned with the shared Ever Green palette.
        slate: {
          50: '#F7F8F4', 100: '#E8EFE9', 200: '#DDE4DC', 300: '#C7D0C8',
          400: '#85928A', 500: '#66736B', 600: '#66736B', 700: '#44534A',
          800: '#334238', 900: '#26352D', 950: '#102D1F',
        },
        gray: {
          50: '#F7F8F4', 100: '#E8EFE9', 200: '#DDE4DC', 300: '#C7D0C8',
          400: '#85928A', 500: '#66736B', 600: '#66736B', 700: '#44534A',
          800: '#334238', 900: '#26352D', 950: '#102D1F',
        },
        emerald: {
          50: '#F7F8F4', 100: '#E8EFE9', 200: '#DDE4DC', 300: '#C7D0C8',
          400: '#85928A', 500: '#66736B', 600: '#173D2B', 700: '#173D2B',
          800: '#173D2B', 900: '#102D1F', 950: '#102D1F',
        },
        green: {
          50: '#F7F8F4', 100: '#E8EFE9', 200: '#DDE4DC', 300: '#C7D0C8',
          400: '#85928A', 500: '#66736B', 600: '#173D2B', 700: '#173D2B',
          800: '#173D2B', 900: '#102D1F', 950: '#102D1F',
        },
        brand: {
          dark: 'var(--color-primary)',
          hover: 'var(--color-primary-hover)',
          navy: 'var(--color-primary)',
          accent: 'var(--color-primary)',
          gold: 'var(--color-secondary)',
          light: 'var(--color-background)',
          muted: 'var(--color-text-muted)',
          card: 'var(--color-white)',
          border: 'var(--color-border)',
          terra: 'var(--eg-terra)',
          terraDark: 'var(--eg-terra-dark)',
          soil: 'var(--eg-soil)',
          olive: 'var(--eg-olive)',
          beige: 'var(--eg-beige)',
          sand: 'var(--eg-sand)',
          charcoal: 'var(--eg-charcoal)',
          ink: 'var(--eg-ink)',
          paper: 'var(--eg-paper)',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'var(--font-cairo)', 'sans-serif'],
        cairo: ['var(--font-cairo)', 'sans-serif'],
      },
      boxShadow: {
        card: 'var(--eg-shadow-1)',
        lift: 'var(--eg-shadow-2)',
        panel: 'var(--eg-shadow-3)',
      },
      borderRadius: {
        token: 'var(--eg-r-md)',
        tokenLg: 'var(--eg-r-lg)',
        pill: 'var(--eg-r-pill)',
      },
    },
  },
  plugins: [],
};

export default config;
