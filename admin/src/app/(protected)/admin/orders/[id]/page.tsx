import OrderDetailClient from './OrderDetailClient'

export function generateStaticParams() {
  return [{ id: '_' }, { id: '601' }, { id: '602' }, { id: '603' }, { id: '604' }, { id: '605' }, { id: '606' }]
}

/*
 * El id **no** se pasa desde aquí.
 *
 * Con `output: 'export'` esta página se construye una vez por cada entrada de
 * `generateStaticParams`, y la que Render sirve para cualquier /admin/orders/N
 * es la del marcador `_`. `Number(params.id)` se evaluaba en el build y dejaba
 * un `NaN` escrito en el HTML, así que el detalle se quedaba en «Cargando
 * pedido…» sin llegar a llamar a la API. Lo lee el cliente de la URL.
 */
export default function AdminOrderDetailPage() {
  return <OrderDetailClient />
}
