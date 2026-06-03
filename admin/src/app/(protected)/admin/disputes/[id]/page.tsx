import DisputeDetailClient from './DisputeDetailClient'

interface Props {
  params: { id: string }
}

export function generateStaticParams() {
  return [{ id: '_' }]
}

export default function AdminDisputeDetailPage({ params }: Props) {
  return <DisputeDetailClient disputeId={Number(params.id)} />
}
