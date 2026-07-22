import type { Config } from 'tailwindcss'

const config: Config = {
  // 'media': el tema sigue la preferencia del sistema operativo del usuario.
  darkMode: 'media',
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    '../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        ruta: {
          // backgrounds
          'page-light': '#f3f4f6',
          'page-dark': '#111214',
          'card-dark': '#1d2025',
          'sidebar-dark': '#17191d',
          'shell-dark': '#181a1e',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
