import CourierOrderDetail from './_components/CourierOrderDetail'

export function generateStaticParams() {
  return [{ id: '_' }]
}

interface PageProps {
  params: { id: string }
}

export default function CourierOrderPage({ params }: PageProps) {
  const orderId = Number(params.id)
  return <CourierOrderDetail orderId={orderId} />
}
