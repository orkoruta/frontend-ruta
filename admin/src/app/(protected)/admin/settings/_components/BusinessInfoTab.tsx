'use client'

import { useContext } from 'react'
import { RutaCard, RutaSectionHeader } from '@orkoruta/ui'
import { SessionContext } from '@/lib/session-context'

export function BusinessInfoTab() {
  const session = useContext(SessionContext)

  return (
    <RutaCard>
      <RutaSectionHeader title="Información del negocio" subtitle="configuración" />
      <dl className="grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            ID de cliente
          </dt>
          <dd className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
            {session?.client_id ?? '—'}
          </dd>
        </div>

        <div>
          <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            Tipo de usuario
          </dt>
          <dd className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
            {session?.user_type ?? '—'}
          </dd>
        </div>

        <div>
          <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            ID de usuario
          </dt>
          <dd className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
            {session?.user_id ?? '—'}
          </dd>
        </div>

        <div>
          <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            Vista de Control activa
          </dt>
          <dd className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
            {session?.acting_via_control_view ? 'Sí' : 'No'}
          </dd>
        </div>
      </dl>

      <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
        Para editar la información corporativa (nombre, logo, descripción), contacta al equipo de
        RUTA.
      </p>
    </RutaCard>
  )
}
