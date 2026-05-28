'use client'

import { RutaCard, RutaPill, RutaSectionHeader } from '@orkoruta/ui'
import type { DeliveryType } from './CheckoutStepper'

interface DeliveryStepProps {
  value: DeliveryType
  onChange: (value: DeliveryType) => void
}

const options: Array<{
  value: DeliveryType
  title: string
  description: string
  badge: string
}> = [
  {
    value: 'SHIP',
    title: 'Entrega a domicilio',
    description: 'Recibe el pedido en una dirección confirmada con mapa.',
    badge: 'SHIP',
  },
  {
    value: 'PICKUP',
    title: 'Recoger en punto físico',
    description: 'Elige un punto autorizado para retirar el pedido.',
    badge: 'PICKUP',
  },
]

export default function DeliveryStep({ value, onChange }: DeliveryStepProps) {
  return (
    <RutaCard>
      <RutaSectionHeader title="Tipo de entrega" subtitle="paso 1" />
      <div className="grid gap-3 sm:grid-cols-2">
        {options.map((option) => {
          const selected = value === option.value
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`rounded-lg border p-4 text-left transition-colors ${
                selected
                  ? 'border-sky-400/50 bg-sky-500/[0.12] dark:border-sky-400/25'
                  : 'border-slate-200/90 bg-white/[0.5] hover:bg-white/[0.76] dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.06]'
              }`}
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {option.title}
                </span>
                <RutaPill variant={selected ? 'blue' : 'slate'}>{option.badge}</RutaPill>
              </div>
              <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                {option.description}
              </p>
            </button>
          )
        })}
      </div>
    </RutaCard>
  )
}
