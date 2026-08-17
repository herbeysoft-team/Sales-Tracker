/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#1C1917',
          soft: '#57534E',
          faint: '#8A8580',
        },
        brand: {
          DEFAULT: '#B3121B',
          dark: '#7A0D14',
          soft: '#FBE4E2',
        },
        paper: '#F7F7F3',
        line: '#E4E1D8',
        card: '#FFFFFF',
        teal: {
          DEFAULT: '#0F6E63',
          soft: '#E4F1EE',
        },
        amber: {
          DEFAULT: '#B4740E',
          soft: '#FBF0DD',
        },
        rust: {
          DEFAULT: '#AA3B2E',
          soft: '#F8E6E3',
        },
      },
      fontFamily: {
        sans: ['"DM Sans"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
