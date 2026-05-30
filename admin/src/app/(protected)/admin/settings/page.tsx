'use client'

import { useContext, useState } from 'react'
import { SessionContext } from '@/lib/session-context'
import { RutaCard, RutaSectionHeader } from '@orkoruta/ui'
import { BusinessInfoTab } from './_components/BusinessInfoTab'
import { WompiTab } from './_components/WompiTab'
import { WebhooksTab } from './_components/WebhooksTab'
import { ParametersTab } from './_components/ParametersTab'

type TabId = 'info' | 'wompi' | 'webhooks' | 'parameters'

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'info', label: 'Información' },
  { id: 'wompi', label: 'Wompi' },
  { id: 'webhooks', label: 'Webhooks' },
  { id: 'parameters', label: 'Parámetros' },
]

export default function SettingsPage() {
  const session = useContext(SessionContext)
  const [activeTab, setActiveTab] = useState<TabId>('info')

  const isAllowed =
    session?.user_type === 'ADMIN_CLIENT' || session?.user_type === 'ADMIN_RUTA'

  if (!isAllowed) {
    return (
      <RutaCard>
        <RutaSectionHeader title="Acceso restringido" subtitle="configuración" />
        <p className="text-sm text-slate-600 dark:text-slate-400">
          No tienes permiso para ver esta sección.
        </p>
      </RutaCard>
    )
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
          administración
        </p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
          Configuración
        </h1>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 rounded-lg border border-slate-200/90 bg-white/[0.76] p-1 dark:border-white/10 dark:bg-[#1d2025]/[0.78]">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={[
                'flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sky-500/[0.12] text-sky-700 dark:text-sky-300'
                  : 'text-slate-600 hover:bg-slate-100/[0.7] dark:text-slate-400 dark:hover:bg-white/[0.04]',
              ].join(' ')}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'info' && <BusinessInfoTab />}
      {activeTab === 'wompi' && <WompiTab />}
      {activeTab === 'webhooks' && <WebhooksTab />}
      {activeTab === 'parameters' && <ParametersTab />}
    </div>
  )
}
