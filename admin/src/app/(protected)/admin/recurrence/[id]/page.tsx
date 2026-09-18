import RecurrenceDetailClient from './RecurrenceDetailClient'

export function generateStaticParams() {
  return [{ id: '_' }]
}

export default function AdminRecurrenceDetailPage() {
  return <RecurrenceDetailClient />
}
