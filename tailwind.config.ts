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
          900: '#17121A', 800: '#5C5259', 700: '#6B5F66', 600: '#8B7F86',
          500: '#8B7F86', 400: '#C3B6BC', 300: '#E4D8DE', 200: '#EAE4E7', 100: '#F3EEF0'
        }
      }
    }
  },
  plugins: []
}
