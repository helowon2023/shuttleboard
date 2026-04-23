/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1E40AF',
        accent: '#F59E0B',
        'in-progress': '#EF4444',
        done: '#10B981',
        background: '#F8FAFC',
      },
      fontFamily: {
        sans: ['Noto Sans JP', 'Inter', 'sans-serif'],
      },
      minHeight: {
        touch: '52px',
      },
      minWidth: {
        touch: '52px',
      },
    },
  },
  plugins: [],
}

module.exports = config
