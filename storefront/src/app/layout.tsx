import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  // El favicon lo resuelve Next con `src/app/icon.svg` (el imagotipo). El
  // título lo reescribe cada tienda; este es el de respaldo.
  title: 'Tienda — RUTA by ORKO',
  description: 'Tienda en línea sobre RUTA by ORKO',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
