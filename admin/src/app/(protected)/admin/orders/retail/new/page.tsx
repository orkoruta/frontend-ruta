import CorporateOrderForm from '../../corporate/_components/CorporateOrderForm'

/**
 * Pedido al detal registrado por el negocio (teléfono, WhatsApp). Usa el mismo
 * formulario que el corporativo con `variant="retail"`: el backend lo guarda
 * con `buyer_type = INDIVIDUAL`.
 */
export default function NewRetailOrderPage() {
  return <CorporateOrderForm variant="retail" />
}
