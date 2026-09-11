import type { Config } from 'tailwindcss'

export default <Partial<Config>>{
  content: [
    './app/components/**/*.{vue,js,ts}',
    './app/pages/**/*.vue',
    './app/app.vue'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Manrope', 'Helvetica', 'Arial', 'sans-serif']
      },
      colors: {
        // Pink/rose brand identity — primary #BE185D, gradient db2777 → e11d48
        brand: {
          50: '#FDF2F8', 100: '#FCE7F3', 200: '#FBCFE8', 300: '#F5B8CD',
          400: '#DB2777', 500: '#BE185D', 600: '#9F1239', 700: '#831843', 800: '#4C0519'
        },
        ink: {
          900: '#20080F', 800: '#3B3238', 700: '#4B3F45', 600: '#6B5F66',
          500: '#7A6570', 400: '#9C8890', 200: '#EDE5E9', 100: '#F5EEF1'
        }
      }
    }
  },
  plugins: []
}
