import OrderDetailClient from './OrderDetailClient'

interface Props {
  params: { id: string }
}

export function generateStaticParams() {
  return [{ id: '_' }, { id: '601' }, { id: '602' }, { id: '603' }, { id: '604' }, { id: '605' }, { id: '606' }]
}

export default function AdminOrderDetailPage({ params }: Props) {
  return <OrderDetailClient orderId={Number(params.id)} />
}
