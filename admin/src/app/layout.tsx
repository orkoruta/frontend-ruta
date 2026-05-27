import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Ruta Admin',
  description: 'Panel de administración RUTA',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
