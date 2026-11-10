/**
 * Renovación automática de la sesión.
 *
 * El access token dura 15 minutos y el refresh token 30 días, pero **ningún
 * frontend llamaba nunca a `/auth/refresh`**: a los 15 minutos la siguiente
 * petición respondía 401 y el panel echaba al usuario a la pantalla de login,
 * a veces a mitad de un pedido. Es el «la sesión se cierra muy seguido» que
 * reportaron comprador, repartidor y administrador.
 *
 * Esto envuelve `window.fetch` una sola vez por pestaña. Cuando una petición a
 * la API responde 401:
 *   1. pide `POST {apiBase}/auth/refresh` — **una sola vez** aunque fallen
 *      varias peticiones a la vez: la API rota el refresh token y revoca el
 *      anterior, así que dos renovaciones simultáneas harían fallar la segunda;
 *   2. repite la petición original con la cookie nueva;
 *   3. si la renovación no funcionó, repite igual una vez: otra pestaña pudo
 *      haber renovado ya (las cookies son compartidas). Si vuelve a dar 401,
 *      se devuelve ese 401 y la app hace lo de siempre (pantalla de login).
 *
 * Se instala envolviendo `fetch` y no en cada cliente HTTP porque hay más de
 * treinta módulos con su propio `request()`; tocar uno por uno garantizaba que
 * alguno quedara sin renovar.
 */

/** Rutas de autenticación: un 401 aquí es la respuesta, no una sesión vencida. */
const AUTH_PATHS = [
  '/auth/login',
  '/auth/ruta-admin/login',
  '/auth/register',
  '/auth/guest',
  '/auth/refresh',
  '/auth/logout',
]

let installed = false
let refreshInFlight: Promise<boolean> | null = null

function resolveApiOrigin(apiBase: string): string {
  // `apiBase` puede ser relativa (`/api`, el proxy de Render) o absoluta.
  return new URL(apiBase, window.location.origin).href.replace(/\/+$/, '')
}

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return new URL(input, window.location.origin).href
  if (input instanceof URL) return input.href
  return input.url
}

/**
 * Instala la renovación. Idempotente: llamarla dos veces no envuelve dos veces.
 *
 * @param apiBase `NEXT_PUBLIC_API_URL` (p. ej. `/api` o `http://localhost:3001`).
 */
export function installSessionRefresh(apiBase: string): void {
  if (installed || typeof window === 'undefined') return
  installed = true

  const apiOrigin = resolveApiOrigin(apiBase)
  const originalFetch = window.fetch.bind(window)

  function refreshSession(): Promise<boolean> {
    if (!refreshInFlight) {
      refreshInFlight = originalFetch(`${apiOrigin}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      })
        .then((res) => res.ok)
        .catch(() => false)
        .finally(() => {
          // Se suelta un poco después: las peticiones que fallaron justo
          // mientras se renovaba reusan este resultado en vez de renovar otra vez.
          setTimeout(() => {
            refreshInFlight = null
          }, 1000)
        })
    }
    return refreshInFlight
  }

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = requestUrl(input)
    const isApi = url.startsWith(apiOrigin + '/')
    const isAuth = isApi && AUTH_PATHS.some((p) => url.startsWith(apiOrigin + p))

    if (!isApi || isAuth) return originalFetch(input, init)

    // Un `Request` solo se puede leer una vez: se guarda una copia para el reintento.
    const retryInput = input instanceof Request ? input.clone() : input
    const response = await originalFetch(input, init)
    if (response.status !== 401) return response

    await refreshSession()
    return originalFetch(retryInput, init)
  }
}
