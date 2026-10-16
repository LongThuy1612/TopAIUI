import type { Config } from 'tailwindcss'

export default <Partial<Config>>{
  content: [
    './app/components/**/*.{vue,js,ts}',
    './app/pages/**/*.vue',
    './app/app.vue',
    './app/layouts/**/*.vue'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Geist', 'system-ui', '-apple-system', 'Segoe UI', 'Helvetica', 'Arial', 'sans-serif']
      },
      colors: {
        // Orange brand (oklch hue 35): 500 = the accent, 600 = accent text / hover.
        brand: {
          50: '#FFF3F0', 100: '#FFEBE4', 200: '#FEDCD3', 300: '#FDBCAB',
          400: '#F37E61', 500: '#E45937', 600: '#C0401F', 700: '#AB3415', 800: '#75220C'
        },
        // Neutral greys: 900 text, 800/700 secondary text, 600/500 muted, 400 faint,
        // 300/200 borders, 100 hairlines and soft backgrounds.
        ink: {
          900: '#17171A', 800: '#55555F', 700: '#6B6B75', 600: '#8B8B95',
          500: '#8B8B95', 400: '#A0A0AA', 300: '#E4E4EA', 200: '#E4E4EA', 100: '#EFEFF2'
        }
      }
    }
  },
  plugins: []
}
