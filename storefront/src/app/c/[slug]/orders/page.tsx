// Placeholder slug so output: 'export' generates the HTML shell.
// Render serves this shell for any /c/*/orders path via SPA fallback.
export function generateStaticParams() {
  return [{ slug: '_' }]
}

import OrdersView from './_components/OrdersView'

export default function OrdersPage() {
  return <OrdersView />
}
