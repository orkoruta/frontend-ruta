// Placeholder slug so output: 'export' generates the HTML shell.
// Render serves this shell for any /c/*/recurrence path via SPA fallback.
export function generateStaticParams() {
  return [{ slug: '_' }]
}

import RecurrenceView from './_components/RecurrenceView'

export default function RecurrencePage() {
  return <RecurrenceView />
}
