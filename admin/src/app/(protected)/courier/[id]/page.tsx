import CourierOrderDetail from './_components/CourierOrderDetail'

export function generateStaticParams() {
  return [{ id: '_' }, { id: '501' }, { id: '502' }, { id: '503' }]
}

/*
 * El id no se pasa desde aquí.
 *
 * Con `output: 'export'` esta página se sirve desde el HTML del marcador `_`,
 * así que `Number(params.id)` se evaluaba **en el build** y dejaba un `NaN`
 * escrito en el documento: el repartidor abría un pedido y se quedaba en
 * «Cargando pedido…» para siempre, sin una sola llamada a la API.
 *
 * Es el mismo fallo que tenían las pantallas del panel. Esta se quedó fuera de
 * aquella corrección porque el id se asignaba a una variable en lugar de ir en
 * línea, y el repaso automático no la reconoció.
 */
export default function CourierOrderPage() {
  return <CourierOrderDetail />
}
