'use client'

/**
 * Estado compartido de la tienda: sesión del comprador y carrito.
 *
 * El header (en el layout) y el catálogo son componentes hermanos, y ambos
 * necesitan lo mismo: saber si hay sesión (para saludar) y cuántos ítems hay en
 * el carrito (para el badge). Sin un estado común, el botón "+ Carrito" del
 * catálogo no tendría cómo avisarle al header que el conteo cambió. Este
 * contexto es esa fuente única.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useParams } from 'next/navigation'
import { getBuyerProfile, startGuestSession, type BuyerProfile } from '@/lib/auth.api'
import {
  addItemsToCart,
  getDraftOrder,
  CartApiError,
  type DraftOrder,
} from '@/lib/cart.api'
import { onUnauthorized } from '@/lib/session-events'

interface StoreContextValue {
  profile: BuyerProfile | null
  loadingSession: boolean
  cart: DraftOrder | null
  /** Suma de cantidades en el carrito, para el badge del header. */
  cartCount: number
  /** Agrega un producto y refresca sesión+carrito. Lanza si no hay sesión. */
  addToCart: (productId: number, quantity?: number) => Promise<void>
  refresh: () => Promise<void>
  /** Limpia el estado tras cerrar sesión, sin recargar la página. */
  clearSession: () => void
}

const StoreContext = createContext<StoreContextValue | null>(null)

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { slug } = useParams<{ slug: string }>()
  const [profile, setProfile] = useState<BuyerProfile | null>(null)
  const [loadingSession, setLoadingSession] = useState(true)
  const [cart, setCart] = useState<DraftOrder | null>(null)

  const refresh = useCallback(async () => {
    // Sesión y carrito se piden juntos: si no hay sesión, el carrito ni se
    // consulta (daría 401).
    try {
      const me = await getBuyerProfile()
      setProfile(me)
      if (!me) {
        setCart(null)
        return
      }
      try {
        setCart(await getDraftOrder())
      } catch (err) {
        // Un 401 tardío (sesión expirada entre llamadas) no debe romper la home.
        if (err instanceof CartApiError && err.status === 401) {
          setProfile(null)
          setCart(null)
        }
      }
    } finally {
      setLoadingSession(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const clearSession = useCallback(() => {
    setProfile(null)
    setCart(null)
  }, [])

  // Un 401 en cualquier llamada (token expirado) limpia la sesión al instante,
  // para que el header no siga mostrando al usuario que ya no tiene sesión.
  useEffect(() => onUnauthorized(clearSession), [clearSession])

  // Al volver a la pestaña se re-valida la sesión: si el token expiró mientras
  // el comprador estaba fuera, el header se actualiza al regresar.
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === 'visible') void refresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  }, [refresh])

  const addToCart = useCallback(
    async (productId: number, quantity = 1) => {
      // Sin sesión, se abre una de invitado de forma transparente: así se puede
      // pedir sin cuenta, sin mandar al login. El pedido queda bajo esa sesión.
      if (!profile) {
        await startGuestSession(slug)
        setProfile(await getBuyerProfile())
      }
      const updated = await addItemsToCart([{ product_id: productId, quantity }])
      setCart(updated)
    },
    [profile, slug],
  )

  const cartCount = useMemo(
    () => (cart?.items ?? []).reduce((sum, item) => sum + item.quantity, 0),
    [cart],
  )

  const value = useMemo(
    () => ({ profile, loadingSession, cart, cartCount, addToCart, refresh, clearSession }),
    [profile, loadingSession, cart, cartCount, addToCart, refresh, clearSession],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore debe usarse dentro de <StoreProvider>')
  return ctx
}
