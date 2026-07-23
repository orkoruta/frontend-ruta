/**
 * Señal global de "sesión no autorizada".
 *
 * Cuando cualquier llamada al backend recibe un 401 (típicamente el token
 * expiró), emite este evento. El `StoreProvider` lo escucha y limpia la sesión,
 * para que el header deje de mostrar "Hola, X" y el carrito de un usuario que ya
 * no tiene sesión.
 */

const UNAUTHORIZED_EVENT = 'ruta:unauthorized'

export function notifyUnauthorized(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
  }
}

export function onUnauthorized(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(UNAUTHORIZED_EVENT, callback)
  return () => window.removeEventListener(UNAUTHORIZED_EVENT, callback)
}
