import BuyerDetailClient from './BuyerDetailClient'

interface BuyerDetailPageProps {
  params: { id: string }
}

export function generateStaticParams() {
  return [{ id: '_' }]
}

/*
 * El id no se pasa desde aquí: con `output: 'export'` esta página se sirve
 * desde el HTML del marcador `_`, así que `params.id` es el del build y no el
 * que pidió el usuario. Lo lee el componente cliente de la URL.
 */
export default function BuyerDetailPage({ params }: BuyerDetailPageProps) {
  return <BuyerDetailClient />
}
