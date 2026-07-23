'use client'

import { RutaCard, RutaPill, RutaSectionHeader } from '@orkoruta/ui'
import type { PaymentMethod, PaymentSubmethod } from './CheckoutStepper'

interface PaymentStepProps {
  paymentMethod: PaymentMethod
  paymentSubmethod: PaymentSubmethod
  /** Si el Cliente no tiene Wompi configurado, no se muestra la opción online. */
  onlinePaymentEnabled: boolean
  onPaymentMethodChange: (value: PaymentMethod) => void
  onPaymentSubmethodChange: (value: PaymentSubmethod) => void
}

const paymentOptions: Array<{
  value: PaymentMethod
  title: string
  description: string
  badge: string
}> = [
  {
    value: 'ONLINE_AT_ORDER',
    title: 'Pago online',
    description: 'Serás redirigido a Wompi para completar el pago.',
    badge: 'Wompi',
  },
  {
    value: 'ELECTRONIC_ON_DELIVERY',
    title: 'Pago electrónico contra entrega',
    description: 'Paga al recibir o retirar usando un método electrónico.',
    badge: 'COD',
  },
  {
    value: 'CASH_ON_DELIVERY',
    title: 'Pago en efectivo contra entrega',
    description: 'El cobro se registra cuando recibes o retiras el pedido.',
    badge: 'Efectivo',
  },
]

const submethods: Array<{ value: PaymentSubmethod; label: string }> = [
  { value: 'DATAFONO', label: 'Datáfono' },
  { value: 'QR', label: 'QR' },
  { value: 'BANK_TRANSFER', label: 'Transferencia' },
]

export default function PaymentStep({
  paymentMethod,
  paymentSubmethod,
  onlinePaymentEnabled,
  onPaymentMethodChange,
  onPaymentSubmethodChange,
}: PaymentStepProps) {
  const showSubmethods = paymentMethod === 'ELECTRONIC_ON_DELIVERY'
  // Oculta "Pago online (Wompi)" cuando el Cliente no tiene la pasarela activa.
  const visibleOptions = paymentOptions.filter(
    (option) => option.value !== 'ONLINE_AT_ORDER' || onlinePaymentEnabled,
  )

  return (
    <RutaCard>
      <RutaSectionHeader title="Método de pago" subtitle="paso 3" />
      <div className="space-y-3">
        {visibleOptions.map((option) => {
          const selected = paymentMethod === option.value
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onPaymentMethodChange(option.value)}
              className={`w-full rounded-lg border p-4 text-left transition-colors ${
                selected
                  ? 'border-emerald-400/50 bg-emerald-500/[0.12] dark:border-emerald-400/25'
                  : 'border-slate-200/90 bg-white/[0.5] hover:bg-white/[0.76] dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.06]'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {option.title}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    {option.description}
                  </p>
                </div>
                <RutaPill variant={selected ? 'green' : 'slate'}>{option.badge}</RutaPill>
              </div>
            </button>
          )
        })}
      </div>

      {showSubmethods && (
        <div className="mt-4 rounded-lg border border-slate-200/90 bg-white/[0.5] p-3 dark:border-white/10 dark:bg-white/[0.04]">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            Submétodo
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            {submethods.map((submethod) => (
              <button
                key={submethod.value}
                type="button"
                onClick={() => onPaymentSubmethodChange(submethod.value)}
                className={`rounded-md border px-3 py-2 text-xs font-semibold transition-colors ${
                  paymentSubmethod === submethod.value
                    ? 'border-violet-400/50 bg-violet-500/[0.12] text-violet-700 dark:border-violet-400/25 dark:text-violet-300'
                    : 'border-slate-200 bg-white/[0.6] text-slate-600 hover:bg-white/[0.85] dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300 dark:hover:bg-white/[0.06]'
                }`}
              >
                {submethod.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </RutaCard>
  )
}
