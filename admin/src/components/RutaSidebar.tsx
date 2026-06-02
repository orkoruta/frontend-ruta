'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useContext } from 'react'
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
  { label: 'Recurrencia', href: '/admin/recurrence', icon: '↻' },
  { label: 'Productos', href: '/admin/products', icon: '▣' },
  { label: 'Compradores', href: '/admin/buyers', icon: '◐' },
  { label: 'Repartidores', href: '/admin/couriers', icon: '▷' },
  { label: 'Puntos físicos', href: '/admin/pickup-points', icon: '◑' },
  { label: 'Configuración', href: '/admin/settings', icon: '◧' },
]

const COURIER_NAV: NavItem[] = [
  { label: 'Mis pedidos', href: '/courier', icon: '◈' },
]

function getNavItems(userType: string): NavItem[] {
  if (userType === 'ADMIN_RUTA') return ADMIN_RUTA_NAV
  if (userType === 'COURIER') return COURIER_NAV
  return CLIENT_NAV
}

interface RutaSidebarProps {
  collapsed: boolean
  onClose?: () => void
}

export function RutaSidebar({ collapsed, onClose }: RutaSidebarProps) {
  const session = useContext(SessionContext)
  const pathname = usePathname()
  const navItems = getNavItems(session?.user_type ?? 'ADMIN_CLIENT')

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
          'bg-[#17191d]/[0.82] border-r border-white/10 backdrop-blur-sm',
          'transition-transform duration-200',
          collapsed ? '-translate-x-full' : 'translate-x-0',
          'lg:relative lg:translate-x-0 lg:z-auto',
        ].join(' ')}
        aria-label="Navegación principal"
      >
        {/* Logo */}
        <div className="flex h-14 shrink-0 items-center px-5 border-b border-white/10">
          <span className="text-sm font-black tracking-widest text-slate-100 uppercase">
            RUTA
          </span>
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
                      'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      active
                        ? 'bg-sky-500/[0.12] text-sky-300 border border-sky-400/25'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] border border-transparent',
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
