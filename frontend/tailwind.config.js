/** @type {import('tailwindcss').Config} */
const defaultTheme = require('tailwindcss/defaultTheme')

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Add Inter to the sans font stack
        sans: ['Inter var', ...defaultTheme.fontFamily.sans],
      },
      // Optional: Define custom colors if needed later
      // colors: {
      //   'primary': '#your-color-hex',
      // }
    },
  },
  plugins: [],
}
