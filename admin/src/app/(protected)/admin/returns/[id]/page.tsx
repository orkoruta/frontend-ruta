import ReturnDetailClient from './ReturnDetailClient'

export function generateStaticParams() {
  return [{ id: '_' }]
}

export default function AdminReturnDetailPage() {
  return <ReturnDetailClient />
}
