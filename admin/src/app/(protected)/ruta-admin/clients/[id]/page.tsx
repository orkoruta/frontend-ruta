import ClientDetailClient from './ClientDetailClient'

interface Props {
  params: { id: string }
}

export function generateStaticParams() {
  return [{ id: '_' }]
}

export default function RutaClientDetailPage({ params }: Props) {
  return <ClientDetailClient clientId={Number(params.id)} />
}
