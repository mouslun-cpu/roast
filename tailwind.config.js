/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        impact: ['Impact', 'Arial Black', 'sans-serif'],
        tc: ['Noto Sans TC', 'sans-serif'],
      },
      colors: {
        'stage-dark': '#080406',
        'brick': '#0d0404',
      },
      keyframes: {
        'flame-core': {
          '0%':   { transform: 'scaleX(1) scaleY(1) translateY(0) rotate(-2deg)' },
          '20%':  { transform: 'scaleX(0.88) scaleY(1.08) translateY(-4%) rotate(1deg)' },
          '40%':  { transform: 'scaleX(1.1) scaleY(0.95) translateY(-8%) rotate(-1deg)' },
          '60%':  { transform: 'scaleX(0.92) scaleY(1.1) translateY(-6%) rotate(2deg)' },
          '80%':  { transform: 'scaleX(1.05) scaleY(0.98) translateY(-10%) rotate(-2deg)' },
          '100%': { transform: 'scaleX(0.95) scaleY(1.12) translateY(-5%) rotate(1deg)' },
        },
        'flame-mid': {
          '0%':   { transform: 'scaleX(1) scaleY(1) translateY(0) rotate(1deg)' },
          '25%':  { transform: 'scaleX(1.1) scaleY(0.92) translateY(-5%) rotate(-3deg)' },
          '50%':  { transform: 'scaleX(0.9) scaleY(1.08) translateY(-12%) rotate(2deg)' },
          '75%':  { transform: 'scaleX(1.05) scaleY(0.95) translateY(-8%) rotate(-1deg)' },
          '100%': { transform: 'scaleX(0.95) scaleY(1.05) translateY(-4%) rotate(3deg)' },
        },
        'flame-tip': {
          '0%':   { transform: 'scaleX(1) scaleY(1) translateY(0) rotate(-3deg)' },
          '30%':  { transform: 'scaleX(0.8) scaleY(1.15) translateY(-15%) rotate(4deg)' },
          '60%':  { transform: 'scaleX(1.2) scaleY(0.88) translateY(-10%) rotate(-4deg)' },
          '100%': { transform: 'scaleX(0.85) scaleY(1.1) translateY(-18%) rotate(2deg)' },
        },
        'danmaku-fly': {
          '0%':   { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-200vw)' },
        },
        'fire-bg': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%':      { backgroundPosition: '100% 50%' },
        },
        'glow-pulse': {
          '0%, 100%': { opacity: '0.8' },
          '50%':      { opacity: '1' },
        },
        'electric': {
          '0%, 100%': { filter: 'drop-shadow(0 0 3px #00ff88)' },
          '50%':      { filter: 'drop-shadow(0 0 8px #00ffaa) drop-shadow(0 0 16px #00ff44)' },
        },
      },
      animation: {
        'flame-core': 'flame-core 1.8s ease-in-out infinite',
        'flame-mid':  'flame-mid 2.1s ease-in-out infinite',
        'flame-tip':  'flame-tip 1.5s ease-in-out infinite',
        'danmaku-fly': 'danmaku-fly 8s linear forwards',
        'fire-bg':    'fire-bg 3s ease infinite',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'electric':   'electric 0.8s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
