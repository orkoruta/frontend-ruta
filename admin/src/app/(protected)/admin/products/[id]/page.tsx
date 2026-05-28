import { ProductEditView } from '../_components/BulkImportModal'

interface ProductDetailPageProps {
  params: { id: string }
}

export function generateStaticParams() {
  return [{ id: '_' }]
}

export default function ProductDetailPage({ params }: ProductDetailPageProps) {
  return <ProductEditView productId={Number(params.id)} />
}
