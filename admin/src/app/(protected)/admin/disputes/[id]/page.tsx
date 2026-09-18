import DisputeDetailClient from './DisputeDetailClient'

export function generateStaticParams() {
  return [{ id: '_' }]
}

export default function AdminDisputeDetailPage() {
  return <DisputeDetailClient />
}
