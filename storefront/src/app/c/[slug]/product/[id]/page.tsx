// Placeholder params so output:'export' generates the HTML shell.
// Render serves this shell for any /c/*/product/* path via SPA fallback.
export function generateStaticParams() {
  return [{ slug: '_', id: '_' }]
}

import ProductView from './_components/ProductView'

export default function ProductPage() {
  return <ProductView />
}
