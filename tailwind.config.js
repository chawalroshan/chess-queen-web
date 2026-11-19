/** @type {import('tailwindcss').Config} */
export default {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--gg-bg)',
        surface: 'var(--gg-surface)',
        surface2: 'var(--gg-surface-2)',
        border: 'var(--gg-border)',
        text: 'var(--gg-text)',
        muted: 'var(--gg-muted)',
        accent: 'var(--gg-accent)',
        danger: 'var(--gg-danger)',
        warn: 'var(--gg-warn)',
        info: 'var(--gg-info)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      borderRadius: {
        card: '8px',
        modal: '12px',
        pill: '999px',
      },
    },
  },
  plugins: [],
};
