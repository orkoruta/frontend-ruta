import PickupPointDetailClient from './PickupPointDetailClient'

interface PickupPointDetailPageProps {
  params: { id: string }
}

export function generateStaticParams() {
  return [{ id: '_' }]
}

export default function PickupPointDetailPage({ params }: PickupPointDetailPageProps) {
  return <PickupPointDetailClient id={params.id} />
}
