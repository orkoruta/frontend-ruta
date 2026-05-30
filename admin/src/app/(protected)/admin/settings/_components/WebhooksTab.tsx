'use client'

import { RutaCard, RutaSectionHeader } from '@orkoruta/ui'

export function WebhooksTab() {
  return (
    <RutaCard>
      <RutaSectionHeader title="Webhooks salientes" subtitle="próximamente" />

      <div className="rounded-md border border-slate-200/90 bg-slate-50/[0.7] px-4 py-6 text-center dark:border-white/10 dark:bg-white/[0.025]">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Próximamente disponible
        </p>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          La configuración de webhooks salientes estará disponible en una próxima actualización.
          Podrás suscribirte a eventos de pedidos y recibirlos en la URL de tu plataforma.
        </p>
      </div>
    </RutaCard>
  )
}
