import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Ruta Admin',
  description: 'Panel de administración RUTA',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* Prevent FOUC: apply saved theme class before first paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('ruta-theme');if(t==='dark')document.documentElement.classList.add('dark')}catch(e){}})()`,
          }}
        />
      </head>
      <body className="bg-[#f3f4f6] dark:bg-[#111214] text-slate-950 dark:text-slate-100 font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
