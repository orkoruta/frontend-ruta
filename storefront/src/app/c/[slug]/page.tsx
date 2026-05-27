// Placeholder slug so output:'export' generates the HTML shell.
// Render serves this shell for any /c/* path via SPA fallback.
export function generateStaticParams() {
  return [{ slug: '_' }]
}

import CatalogView from './_components/CatalogView'

export default function CatalogPage() {
  return <CatalogView />
}
