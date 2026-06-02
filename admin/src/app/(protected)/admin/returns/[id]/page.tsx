import ReturnDetailClient from './ReturnDetailClient'

interface Props {
  params: { id: string }
}

export function generateStaticParams() {
  return [{ id: '_' }]
}

export default function AdminReturnDetailPage({ params }: Props) {
  return <ReturnDetailClient returnId={Number(params.id)} />
}
