import RefundDetailClient from './RefundDetailClient'

interface Props {
  params: { id: string }
}

export function generateStaticParams() {
  return [{ id: '_' }]
}

export default function AdminRefundDetailPage({ params }: Props) {
  return <RefundDetailClient refundId={Number(params.id)} />
}
