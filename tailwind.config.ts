import type { Config } from 'tailwindcss'

export default <Partial<Config>>{
  content: [
    './app/components/**/*.{vue,js,ts}',
    './app/pages/**/*.vue',
    './app/app.vue'
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4ff', 100: '#dbe8ff', 200: '#b8d1ff', 300: '#8ab2ff',
          400: '#5a8cff', 500: '#2f66f5', 600: '#204ed6', 700: '#1a3fac'
        },
        ink: {
          900: '#0f1420', 800: '#1a2133', 600: '#4a5468',
          400: '#8892a4', 200: '#dfe3ea', 100: '#eef1f5'
        }
      }
    }
  },
  plugins: []
}
