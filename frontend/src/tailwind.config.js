/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        gen: {
          deep: '#0b1220',
          lav: '#5b5bd6',
          pink: '#ff6ec7',
          cyan: '#22d3ee',
        },
      },
      boxShadow: {
        'glow-md': '0 0 30px rgba(255,110,199,0.25)',
      },
    },
  },
  plugins: [],
}
