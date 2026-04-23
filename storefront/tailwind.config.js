/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: 'var(--color-primary, #B45309)',
          secondary: 'var(--color-secondary, #FDE68A)',
          accent: 'var(--color-accent, #DC2626)',
          background: 'var(--color-background, #FFFBF5)',
          text: 'var(--color-text, #1F2937)',
          'text-muted': 'var(--color-text-muted, #6B7280)',
        },
      },
    },
  },
  plugins: [],
};
