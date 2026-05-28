import CourierDetailClient from './CourierDetailClient'

interface CourierDetailPageProps {
  params: { id: string }
}

export function generateStaticParams() {
  return [{ id: '_' }]
}

export default function CourierDetailPage({ params }: CourierDetailPageProps) {
  return <CourierDetailClient id={params.id} />
}
