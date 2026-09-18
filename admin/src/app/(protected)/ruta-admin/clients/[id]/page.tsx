import ClientDetailClient from './ClientDetailClient'

export function generateStaticParams() {
  return [{ id: '_' }]
}

export default function RutaClientDetailPage() {
  return <ClientDetailClient />
}
