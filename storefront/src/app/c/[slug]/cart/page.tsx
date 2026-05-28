// Placeholder slug so output: 'export' generates the HTML shell.
// Render serves this shell for any /c/*/cart path via SPA fallback.
export function generateStaticParams() {
  return [{ slug: '_' }]
}

import CartView from './_components/CartView'

export default function CartPage() {
  return <CartView />
}
