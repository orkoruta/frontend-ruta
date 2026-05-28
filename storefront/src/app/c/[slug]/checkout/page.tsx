// Placeholder slug so output: 'export' generates the HTML shell.
// Render serves this shell for any /c/*/checkout path via SPA fallback.
export function generateStaticParams() {
  return [{ slug: '_' }]
}

import CheckoutStepper from './_components/CheckoutStepper'

export default function CheckoutPage() {
  return <CheckoutStepper />
}
