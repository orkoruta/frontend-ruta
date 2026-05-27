'use client'

import { useEffect, useState } from 'react'

export function RutaThemeToggle() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('ruta-theme')
    if (stored === 'dark') {
      document.documentElement.classList.add('dark')
      setDark(true)
    }
  }, [])

  const toggle = () => {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('ruta-theme', next ? 'dark' : 'light')
  }

  return (
    <button
      onClick={toggle}
      className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white/[0.76] px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-white/90 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300"
    >
      {dark ? '☀ Claro' : '☾ Oscuro'}
    </button>
  )
}
