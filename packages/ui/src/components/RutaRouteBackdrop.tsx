/**
 * Fondo de rutas.
 *
 * El motivo de la marca —el trazo que se recorre— como atmósfera de la
 * pantalla. Nació en el login y se generalizó aquí para que todas las
 * pantallas que lo lleven se muevan igual, en vez de que cada una invente su
 * propia versión.
 *
 * Reglas de uso:
 * - Va **solo donde hay aire**: portadas, cabeceras de página, estados vacíos.
 *   En pantallas densas (tablas, el mapa) compite con el contenido y estorba.
 * - Es decoración: `aria-hidden` y `pointer-events-none`, siempre.
 * - El contenedor padre necesita `relative isolate overflow-hidden`.
 *   **`isolate` no es opcional**: el fondo va en `-z-10`, y sin un contexto de
 *   apilamiento propio ese `-z-10` se escapa al contexto raíz y termina
 *   escondido detrás del fondo de la tarjeta o de la página.
 * - Se apaga solo con `prefers-reduced-motion` (las clases `u-travel`/`u-draw`
 *   lo respetan): los trazos se quedan visibles y quietos.
 *
 * Cada variante se limita a **tres trazos**, de los cuales como mucho dos
 * animan en bucle. Es una animación de repintado continuo: con más trazos por
 * pantalla se nota en equipos modestos, que es justo donde corre el panel del
 * repartidor.
 */

type RouteBackdropVariant = 'flow' | 'descend' | 'corner'

interface RutaRouteBackdropProps {
  /**
   * `flow`: curvas que barren de lado a lado. Para portadas y pantallas
   * completas (es la del login).
   * `descend`: ruta que baja. Para columnas estrechas, como la barra lateral.
   * `corner`: entra por una esquina y se va. Para cabeceras de página, donde
   * el centro debe quedar limpio.
   */
  variant?: RouteBackdropVariant
  /** Color y opacidad. Por defecto, marca muy apagada. */
  className?: string
}

const COMMON = {
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round' as const,
}

export function RutaRouteBackdrop({
  variant = 'flow',
  className = 'text-brand-500/[0.18]',
}: RutaRouteBackdropProps) {
  const shared = {
    'aria-hidden': true as const,
    className: `pointer-events-none absolute inset-0 -z-10 h-full w-full ${className}`,
    preserveAspectRatio: 'xMidYMid slice' as const,
  }

  if (variant === 'descend') {
    return (
      <svg {...shared} viewBox="0 0 240 800">
        <path
          d="M-20 -20 C 90 120, 30 260, 140 400 S 90 640, 200 820"
          pathLength={1}
          strokeWidth={3}
          className="u-travel"
          {...COMMON}
        />
        <path
          d="M260 40 C 150 180, 210 320, 100 460 S 150 700, 40 840"
          pathLength={1}
          strokeWidth={2}
          className="u-draw"
          {...COMMON}
        />
      </svg>
    )
  }

  if (variant === 'corner') {
    return (
      <svg {...shared} viewBox="0 0 1200 320">
        <path
          d="M700 -40 C 820 60, 900 40, 1000 140 S 1140 200, 1260 180"
          pathLength={1}
          strokeWidth={3}
          className="u-travel"
          {...COMMON}
        />
        <path
          d="M840 -20 C 940 100, 1040 80, 1120 200"
          pathLength={1}
          strokeWidth={2}
          className="u-draw"
          {...COMMON}
        />
      </svg>
    )
  }

  return (
    <svg {...shared} viewBox="0 0 1200 800">
      <path
        d="M-40 620 C 220 620, 260 380, 480 380 S 760 180, 1000 180 1240 300 1240 300"
        pathLength={1}
        strokeWidth={3}
        className="u-travel"
        {...COMMON}
      />
      <path
        d="M-40 720 C 260 720, 320 520, 620 520 S 980 420, 1240 460"
        pathLength={1}
        strokeWidth={2}
        className="u-draw"
        {...COMMON}
      />
    </svg>
  )
}
