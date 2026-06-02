// Placeholder slug so output: 'export' generates the HTML shell.
// Render serves this shell for any /c/*/recurrence/:id path via SPA fallback.
export function generateStaticParams() {
  return [{ slug: '_', id: '0' }]
}

import RecurrenceDetailView from './_components/RecurrenceDetailView'

export default function RecurrenceDetailPage() {
  return <RecurrenceDetailView />
}
