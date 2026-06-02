import RecurrenceDetailClient from './RecurrenceDetailClient'

interface Props {
  params: { id: string }
}

export function generateStaticParams() {
  return [{ id: '_' }]
}

export default function AdminRecurrenceDetailPage({ params }: Props) {
  return <RecurrenceDetailClient templateId={Number(params.id)} />
}
