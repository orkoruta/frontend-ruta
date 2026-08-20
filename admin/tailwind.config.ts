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
        // Escala de marca RUTA, derivada del naranja del logo (#FD8B43 = 500)
        // manteniendo el tono (23°) y modulando luminosidad. `brand` es el
        // acento primario de la app: botones de acción, foco, estado activo.
        // Los colores semánticos (emerald/amber/rose/blue) NO se tocan: siguen
        // significando éxito / aviso / error / en curso.
        brand: {
          50: '#FFF4ED',
          100: '#FFE8D9',
          200: '#FED2B6',
          300: '#FEB98D',
          400: '#FDA268',
          500: '#FD8B43',
          600: '#EF7427',
          700: '#CC5D17',
          800: '#9E4D1A',
          900: '#7A3F1A',
          950: '#4E2A13',
        },
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
      boxShadow: {
        // Elevación tintada de marca para la acción primaria: da jerarquía sin
        // recurrir a una sombra gris genérica.
        brand: '0 1px 2px 0 rgb(204 93 23 / 0.20), 0 4px 12px -2px rgb(204 93 23 / 0.25)',
      },
    },
  },
  plugins: [],
}

export default config
