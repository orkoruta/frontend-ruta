// Placeholder params so output: 'export' generates the HTML shell.
// Render serves this shell for any /c/*/orders/* path via SPA fallback.
export function generateStaticParams() {
  return [{ slug: '_', id: '_' }]
}

import OrderDetailView from './_components/OrderDetailView'

export default function OrderDetailPage() {
  return <OrderDetailView />
}
