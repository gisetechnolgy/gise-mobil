/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        app: {
          bg: '#F1F1F1',
          card: '#FFFFFF',
          navy: '#343D48',
          hero: '#AE256D',
        },
        primary: {
          DEFAULT: '#AE256D',
          50: '#FDF2F7',
          100: '#F5D6E6',
          200: '#EBADD0',
          300: '#DE84B8',
          400: '#C9468F',
          500: '#AE256D',
          600: '#8F1E5A',
          700: '#701848',
          800: '#521236',
          900: '#340C23',
        },
      },
      fontFamily: {
        sans: ['PoppinsRegular', 'Poppins', 'sans-serif'],
        regular: ['PoppinsRegular', 'Poppins', 'sans-serif'],
        medium: ['PoppinsMedium', 'Poppins', 'sans-serif'],
        semibold: ['PoppinsSemiBold', 'Poppins', 'sans-serif'],
        bold: ['PoppinsBold', 'Poppins', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
