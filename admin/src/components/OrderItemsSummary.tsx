/**
 * Productos de un pedido en una celda de tabla: «3× Aguacate Hass». Lo que el
 * operador necesita para alistar sin abrir el pedido.
 */
export interface OrderItemLine {
  product_name: string
  quantity: number
}

export function OrderItemsSummary({
  items,
  max = 4,
}: {
  items: OrderItemLine[] | undefined
  /** Líneas visibles; el resto se resume en «+N más». */
  max?: number
}) {
  if (!items || items.length === 0) {
    return <span className="text-slate-400">—</span>
  }

  const visible = items.slice(0, max)
  const hidden = items.slice(max)
  const hiddenUnits = hidden.reduce((acc, i) => acc + i.quantity, 0)

  return (
    <ul className="flex min-w-[10rem] max-w-[18rem] flex-col gap-0.5 text-xs leading-snug">
      {visible.map((item, idx) => (
        <li key={`${item.product_name}-${idx}`} className="flex gap-1.5">
          <span className="shrink-0 font-semibold tabular-nums text-slate-900 dark:text-slate-100">
            {item.quantity}×
          </span>
          <span className="text-slate-600 dark:text-slate-400">{item.product_name}</span>
        </li>
      ))}
      {hidden.length > 0 && (
        <li
          className="text-slate-500 dark:text-slate-400"
          title={hidden.map((i) => `${i.quantity}× ${i.product_name}`).join('\n')}
        >
          +{hidden.length} más ({hiddenUnits} und.)
        </li>
      )}
    </ul>
  )
}
