import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Ruta Admin',
  description: 'Panel de administración RUTA',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // El tema lo resuelve el navegador con prefers-color-scheme (Tailwind en
    // modo 'media'), así que no hace falta script anti-FOUC ni clase en <html>.
    <html lang="es">
      <body className="bg-[#f3f4f6] dark:bg-[#111214] text-slate-950 dark:text-slate-100 font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
