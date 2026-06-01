export const SESSION_KEY = 'ruta_session'

export interface RutaSession {
  user_id: number
  client_id: number | null
  client_slug?: string
  user_type: 'ADMIN_RUTA' | 'ADMIN_CLIENT' | 'OPERATOR_CLIENT' | 'COURIER' | 'BUYER'
  acting_via_control_view: boolean
  impersonating?: boolean
  target_client_id?: number
  target_client_name?: string
}
