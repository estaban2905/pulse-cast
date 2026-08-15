export default {content: [
  './index.html',
  './src/**/*.{js,ts,jsx,tsx}'
],
  theme: {
    extend: {
      colors: {
        c1: 'rgb(var(--c1-rgb) / <alpha-value>)',
        c2: 'rgb(var(--c2-rgb) / <alpha-value>)',
        c3: 'rgb(var(--c3-rgb) / <alpha-value>)',
        stage: 'rgb(var(--bg-rgb) / <alpha-value>)',
      },
      fontFamily: {
        display: ['Sora', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        floaty: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-14px)' },
        },
        panGradient: {
          '0%': { transform: 'translate3d(-6%, -4%, 0) scale(1.1)' },
          '50%': { transform: 'translate3d(6%, 4%, 0) scale(1.25)' },
          '100%': { transform: 'translate3d(-6%, -4%, 0) scale(1.1)' },
        },
        spinSlow: {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        beatDot: {
          '0%, 100%': { opacity: '0.35', transform: 'scale(0.85)' },
          '50%': { opacity: '1', transform: 'scale(1.15)' },
        },
      },
      animation: {
        floaty: 'floaty 7s ease-in-out infinite',
        panGradient: 'panGradient 26s ease-in-out infinite',
        spinSlow: 'spinSlow 40s linear infinite',
        beatDot: 'beatDot 1.1s ease-in-out infinite',
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.23, 1, 0.32, 1)',
      },
    },
  },
}
