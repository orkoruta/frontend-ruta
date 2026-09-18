import RefundDetailClient from './RefundDetailClient'

export function generateStaticParams() {
  return [{ id: '_' }]
}

export default function AdminRefundDetailPage() {
  return <RefundDetailClient />
}
