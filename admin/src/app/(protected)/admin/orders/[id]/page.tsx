import OrderDetailClient from './OrderDetailClient'

interface Props {
  params: { id: string }
}

export function generateStaticParams() {
  return [{ id: '_' }]
}

export default function AdminOrderDetailPage({ params }: Props) {
  return <OrderDetailClient orderId={Number(params.id)} />
}
