// Placeholder slug so output: 'export' generates the HTML shell.
// Render serves this shell for any /c/*/recurrence/:id path via SPA fallback.
export function generateStaticParams() {
  // El marcador es '_' como en todas las demás rutas dinámicas: el rewrite de
  // Render apunta a `/c/_/recurrence/_.html`. Aquí ponía '0', que generaba
  // `0.html` y dejaba la regla sin destino.
  return [{ slug: '_', id: '_' }]
}

import RecurrenceDetailView from './_components/RecurrenceDetailView'

export default function RecurrenceDetailPage() {
  return <RecurrenceDetailView />
}
