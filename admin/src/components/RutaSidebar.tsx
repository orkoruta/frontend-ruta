'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useContext } from 'react'
import { RutaLogo, RutaRouteBackdrop } from '@orkoruta/ui'
import { SessionContext } from '@/lib/session-context'

interface NavItem {
  label: string
  href: string
  icon: string
}

const ADMIN_RUTA_NAV: NavItem[] = [
  { label: 'Clientes', href: '/ruta-admin/clients', icon: '◈' },
  { label: 'Dashboard global', href: '/ruta-admin/dashboard', icon: '◉' },
  { label: 'Auditoría', href: '/ruta-admin/audit', icon: '◎' },
]

const CLIENT_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: '◉' },
  { label: 'Pedidos', href: '/admin/orders', icon: '◈' },
  { label: 'Mapa', href: '/admin/orders/map', icon: '◎' },
  { label: 'Reembolsos', href: '/admin/refunds', icon: '↩' },
  { label: 'Devoluciones', href: '/admin/returns', icon: '↺' },
  { label: 'Disputas', href: '/admin/disputes', icon: '⚑' },
  { label: 'Recurrencia', href: '/admin/recurrence', icon: '↻' },
  { label: 'Corporativos', href: '/admin/orders/corporate/new', icon: '⊞' },
  { label: 'Productos', href: '/admin/products', icon: '▣' },
  { label: 'Compradores', href: '/admin/buyers', icon: '◐' },
  { label: 'Repartidores', href: '/admin/couriers', icon: '▷' },
  { label: 'Puntos físicos', href: '/admin/pickup-points', icon: '◑' },
  { label: 'Configuración', href: '/admin/settings', icon: '◧' },
]

const CLIENT_API_EXTRA_NAV: NavItem[] = [
  { label: 'API Keys', href: '/admin/api-keys', icon: '⚿' },
]

const COURIER_NAV: NavItem[] = [
  { label: 'Mis pedidos', href: '/courier', icon: '◈' },
]

function getNavItems(userType: string, clientType?: string): NavItem[] {
  if (userType === 'ADMIN_RUTA') return ADMIN_RUTA_NAV
  if (userType === 'COURIER') return COURIER_NAV
  if (clientType === 'API') return [...CLIENT_NAV, ...CLIENT_API_EXTRA_NAV]
  return CLIENT_NAV
}

/**
 * A dónde lleva el logo. Va a la primera pantalla del rol y no a `/`, que
 * redirige a `/login` y este a su vez rebota al panel: dos saltos y un
 * parpadeo del formulario de acceso para acabar donde ya estabas.
 */
function getHomeHref(userType: string): string {
  if (userType === 'ADMIN_RUTA') return '/ruta-admin/dashboard'
  if (userType === 'COURIER') return '/courier'
  return '/admin/dashboard'
}

interface RutaSidebarProps {
  collapsed: boolean
  onClose?: () => void
}

export function RutaSidebar({ collapsed, onClose }: RutaSidebarProps) {
  const session = useContext(SessionContext)
  const pathname = usePathname()
  const navItems = getNavItems(session?.user_type ?? 'ADMIN_CLIENT', session?.client_type)
  const homeHref = getHomeHref(session?.user_type ?? 'ADMIN_CLIENT')

  return (
    <>
      {/* Mobile overlay */}
      {!collapsed && (
        <div
          className="fixed inset-0 z-20 bg-black/[0.4] lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={[
          'fixed top-0 left-0 z-30 flex h-full w-60 flex-col',
          // `relative`+`overflow-hidden` para que el fondo de rutas quede
          // recortado a la columna; en `lg` el `relative` ya lo da la clase.
          'overflow-hidden bg-[#17191d]/[0.82] border-r border-white/10 backdrop-blur-sm',
          'transition-transform duration-200',
          collapsed ? '-translate-x-full' : 'translate-x-0',
          'lg:relative lg:translate-x-0 lg:z-auto',
        ].join(' ')}
        aria-label="Navegación principal"
      >
        {/* Muy apagada: aquí compite con los rótulos de navegación, así que
            va a la mitad de opacidad que en las portadas. */}
        <RutaRouteBackdrop variant="descend" className="text-brand-500/[0.09]" />

        {/* Logo */}
        {/* h-24 (96px) para que el logo quepa a 144px de ancho, que es donde
            el "by ORKO" empieza a leerse (a 128px todavía se empasta). La
            cabecera superior sube a la misma altura para que los bordes
            inferiores sigan alineados. `overflow-hidden` evita desbordes si
            alguien retoca el tamaño. */}
        <div className="flex h-24 shrink-0 items-center overflow-hidden px-5 border-b border-white/10">
          <Link
            href={homeHref}
            aria-label="RUTA — inicio"
            className="group inline-flex items-center rounded-lg transition-transform duration-300 hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60"
          >
            <RutaLogo className="h-auto w-36 text-brand-500" />
          </Link>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <ul className="space-y-0.5" role="list">
            {navItems.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={[
                      'relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      // La barra de marca en el borde izquierdo marca dónde
                      // estás sin depender solo del tinte de fondo, que en
                      // oscuro es muy sutil.
                      'before:absolute before:left-0 before:top-1/2 before:h-5 before:w-[3px] before:-translate-y-1/2 before:rounded-r-full before:transition-colors',
                      active
                        ? 'bg-brand-500/[0.12] text-brand-300 before:bg-brand-500'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] before:bg-transparent',
                    ].join(' ')}
                    aria-current={active ? 'page' : undefined}
                  >
                    <span className="text-xs" aria-hidden="true">
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Footer: role + client info */}
        {session && (
          <div className="shrink-0 px-4 py-3 border-t border-white/10">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500 truncate">
              {session.user_type}
            </p>
            {session.client_id && (
              <p className="text-xs text-slate-400 mt-0.5 truncate">
                Cliente #{session.client_id}
              </p>
            )}
          </div>
        )}
      </aside>
    </>
  )
}
