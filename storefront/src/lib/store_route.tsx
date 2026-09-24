'use client'

import { createContext, useContext } from 'react'

/**
 * El slug de la tienda, resuelto **una sola vez** en el layout.
 *
 * Por qué no vale `useParams()`: el storefront es export estático. Cada ruta se
 * construye una vez con el marcador `_` (`generateStaticParams([{ slug: '_' }])`)
 * y Render reescribe cualquier `/c/tienda/...` a ese mismo HTML. El árbol de
 * rutas queda horneado con el segmento literal `_`, así que `useParams()`
 * devuelve `{ slug: '_' }` y no la tienda que pidió el visitante. El síntoma es
 * una pantalla que se queda cargando para siempre sin una sola petición en la
 * pestaña de red.
 *
 * El layout resuelve el slug de la URL y no pinta nada hasta tenerlo, de modo
 * que aquí abajo **siempre llega un valor**: ninguna pantalla necesita
 * comprobar si es nulo, que es donde se cuelan los errores.
 */
const StoreSlugContext = createContext<string | null>(null)

export function StoreSlugProvider({
  slug,
  children,
}: {
  slug: string
  children: React.ReactNode
}) {
  return <StoreSlugContext.Provider value={slug}>{children}</StoreSlugContext.Provider>
}

/** El slug de la tienda actual. Nunca es nulo dentro del layout. */
export function useStoreSlug(): string {
  const slug = useContext(StoreSlugContext)
  if (slug === null) {
    throw new Error('useStoreSlug debe usarse dentro de <StoreSlugProvider>')
  }
  return slug
}
