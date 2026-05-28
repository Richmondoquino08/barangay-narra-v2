export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      colors: {
        primary: { DEFAULT: '#4F46E5', 50: '#EEF2FF', 600: '#4F46E5', 700: '#4338CA' },
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        elevated: '0 10px 25px rgba(15,23,42,0.1)',
      },
      animation: {
        'slide-in':   'slideIn 0.25s ease-out',
        'fade-in':    'fadeIn 0.2s ease-out',
        'pop-in':     'popIn 0.3s cubic-bezier(0.175,0.885,0.32,1.275)',
        'slide-down': 'slideDown 0.3s ease-out',
      },
      keyframes: {
        slideIn:   { from: { opacity: 0, transform: 'translateX(1rem)' },   to: { opacity: 1, transform: 'translateX(0)' } },
        fadeIn:    { from: { opacity: 0, transform: 'translateY(0.5rem)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        popIn:     { from: { opacity: 0, transform: 'scale(0.85)' },        to: { opacity: 1, transform: 'scale(1)' } },
        slideDown: { from: { opacity: 0, transform: 'translateY(-1rem)' },  to: { opacity: 1, transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
};