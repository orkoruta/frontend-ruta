/**
 * Señal global de «sesión no autorizada» para el panel del Cliente.
 *
 * Portado del storefront, que ya lo tenía. Sin esto, cuando el token caducaba
 * el admin no reaccionaba: las pantallas se quedaban vacías o mostraban errores
 * sueltos, y el usuario no sabía que lo que le pasaba es que había que volver a
 * entrar. En el mapa de asignación, que recarga cada 30 s, se veía como una
 * ráfaga de 401 en la consola sin nada en pantalla.
 *
 * El panel tiene ~16 funciones `request()` distintas —una por módulo de API—,
 * así que no hay un único punto por el que pase todo. Cada una emite este
 * evento al recibir un 401 y `SessionProvider` lo escucha una sola vez: limpia
 * la sesión y manda al login.
 *
 * Se usa un `Event` del DOM y no un módulo con estado para que no importe qué
 * copia del módulo cargue cada bundle.
 */

const UNAUTHORIZED_EVENT = 'ruta:unauthorized'

/** Llamar cuando una respuesta del backend venga con 401. */
export function notifyUnauthorized(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
  }
}

/** Devuelve la función para dejar de escuchar. */
export function onUnauthorized(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(UNAUTHORIZED_EVENT, callback)
  return () => window.removeEventListener(UNAUTHORIZED_EVENT, callback)
}
