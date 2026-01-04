module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'gen-pink': '#ff6bcb',
        'gen-cyan': '#00e5ff',
        'gen-lav': '#a78bfa',
        'gen-yellow': '#ffd166',
        'gen-deep': '#0f1724'
      },
      boxShadow: {
        'glow-md': '0 8px 30px rgba(167,139,250,0.18)'
      }
    }
  },
  plugins: [],
}
