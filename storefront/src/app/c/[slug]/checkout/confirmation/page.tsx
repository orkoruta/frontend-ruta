import { Suspense } from 'react'
import ConfirmationView from './_components/ConfirmationView'

// Placeholder slug so output: 'export' generates the HTML shell.
// Render serves this shell for any /c/*/checkout/confirmation path via SPA fallback.
export function generateStaticParams() {
  return [{ slug: '_' }]
}

export default function CheckoutConfirmationPage() {
  return (
    <Suspense fallback={<ConfirmationFallback />}>
      <ConfirmationView />
    </Suspense>
  )
}

function ConfirmationFallback() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <div className="rounded-lg border border-slate-200/90 bg-white/[0.76] p-8 text-center shadow-sm dark:border-white/10 dark:bg-[#1d2025]/[0.78]">
        <div className="mx-auto mb-5 h-16 w-16 animate-pulse rounded-full bg-amber-500/[0.14]" />
        <div className="mx-auto mb-3 h-7 w-64 animate-pulse rounded-md bg-slate-200 dark:bg-slate-700" />
        <div className="mx-auto h-4 w-80 max-w-full animate-pulse rounded-md bg-slate-200 dark:bg-slate-700" />
      </div>
    </div>
  )
}
