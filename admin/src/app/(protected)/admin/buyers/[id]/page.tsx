import BuyerDetailClient from './BuyerDetailClient'

interface BuyerDetailPageProps {
  params: { id: string }
}

export function generateStaticParams() {
  return [{ id: '_' }]
}

export default function BuyerDetailPage({ params }: BuyerDetailPageProps) {
  return <BuyerDetailClient id={params.id} />
}
