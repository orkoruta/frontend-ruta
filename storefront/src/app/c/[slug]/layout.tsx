'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { getClientBySlug, type ClientPublicInfo } from '@/lib/catalog.api'

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const { slug } = useParams<{ slug: string }>()
  const [clientInfo, setClientInfo] = useState<ClientPublicInfo | null>(null)

  useEffect(() => {
    if (!slug) return
    getClientBySlug(slug)
      .then(setClientInfo)
      .catch(() => setClientInfo(null))
  }, [slug])

  return (
    <div className="flex min-h-screen flex-col bg-[#f3f4f6] text-slate-950 dark:bg-[#111214] dark:text-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/[0.76] backdrop-blur-sm dark:border-white/10 dark:bg-[#181a1e]/[0.78]">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link
            href={`/c/${slug}`}
            className="flex items-center gap-2 text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100"
          >
            {clientInfo?.logo_url ? (
              <Image
                src={clientInfo.logo_url}
                alt={clientInfo.name}
                width={120}
                height={28}
                className="h-7 w-auto object-contain"
              />
            ) : (
              <span className="text-base font-black tracking-tight">
                {clientInfo?.name ?? ' '}
              </span>
            )}
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href={`/c/${slug}/login`}
              className="inline-flex items-center rounded-md border border-slate-200 bg-white/[0.85] px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-white dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-300 dark:hover:bg-white/[0.08]"
            >
              Iniciar sesión
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1">{children}</div>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white/[0.76] py-6 dark:border-white/10 dark:bg-[#181a1e]/[0.78]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
            {clientInfo && (
              <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                {clientInfo.name}
              </p>
            )}
            <p className="text-[10px] tracking-wide text-slate-400 dark:text-slate-600">
              Powered by RUTA
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
