/**
 * Ilustraciones de estado vacío.
 *
 * Todas hablan el mismo idioma, tomado de la marca: **trazo de línea** del
 * mismo grosor que el logotipo, esquinas redondeadas, y la **ruta punteada**
 * como elemento recurrente — es lo que hace la empresa, y aparece dibujándose
 * o recorriéndose en vez de estar quieta.
 *
 * Convenciones internas:
 * - `currentColor` para el trazo principal, así heredan el color de marca.
 * - El trazo secundario va en `slate` translúcido: da contexto sin competir.
 * - Los `path` animados llevan `pathLength={1}`, que normaliza la longitud del
 *   trazo a 1 y permite animar `stroke-dashoffset` sin medir el recorrido real.
 * - La animación vive en clases de `globals.css` (`u-draw`, `u-travel`,
 *   `u-float`), que se apagan solas con `prefers-reduced-motion`.
 */

interface IllustrationProps {
  className?: string
}

const STROKE = {
  strokeWidth: 3,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  fill: 'none',
}

/** Trazo de apoyo: presente pero en segundo plano. */
const MUTED = 'stroke-slate-400/40 dark:stroke-slate-500/30'

/**
 * Sin pedidos: una caja abierta y vacía, con la ruta pasando de largo.
 * La caja se dibuja al entrar; la ruta se recorre en bucle.
 */
export function IllustrationNoOrders({ className = '' }: IllustrationProps) {
  return (
    <svg viewBox="0 0 160 120" className={className} role="presentation" aria-hidden="true">
      {/* Ruta que pasa por detrás */}
      <path
        d="M8 96 C 44 96, 44 62, 80 62 S 116 96, 152 96"
        pathLength={1}
        className={`${MUTED} u-travel`}
        {...STROKE}
        strokeWidth={2}
      />
      {/* Solapas abiertas */}
      <path d="M56 44 L44 30" pathLength={1} className="u-draw" stroke="currentColor" {...STROKE} />
      <path d="M104 44 L116 30" pathLength={1} className="u-draw" stroke="currentColor" {...STROKE} />
      {/* Cuerpo de la caja */}
      <path
        d="M46 46 H114 V92 H46 Z"
        pathLength={1}
        className="u-draw"
        stroke="currentColor"
        {...STROKE}
      />
      {/* Cinta central */}
      <path
        d="M80 46 V92"
        pathLength={1}
        className={`${MUTED} u-draw`}
        {...STROKE}
        strokeWidth={2}
      />
    </svg>
  )
}

/**
 * Sin resultados en el mapa: un pin sobre una ruta que no lleva a nada.
 * El pin flota; la ruta se recorre.
 */
export function IllustrationEmptyMap({ className = '' }: IllustrationProps) {
  return (
    <svg viewBox="0 0 160 120" className={className} role="presentation" aria-hidden="true">
      {/* Retícula del mapa */}
      <path d="M20 34 H140" pathLength={1} className={MUTED} {...STROKE} strokeWidth={2} />
      <path d="M20 62 H140" pathLength={1} className={MUTED} {...STROKE} strokeWidth={2} />
      <path d="M20 90 H140" pathLength={1} className={MUTED} {...STROKE} strokeWidth={2} />
      <path d="M52 20 V104" pathLength={1} className={MUTED} {...STROKE} strokeWidth={2} />
      <path d="M108 20 V104" pathLength={1} className={MUTED} {...STROKE} strokeWidth={2} />
      {/* Ruta */}
      <path
        d="M28 96 H68 V54 H124"
        pathLength={1}
        className="u-travel"
        stroke="currentColor"
        {...STROKE}
      />
      {/* Pin */}
      <g className="u-float">
        <path
          d="M80 26 c 9 0 16 7 16 16 c 0 12 -16 26 -16 26 s -16 -14 -16 -26 c 0 -9 7 -16 16 -16 z"
          pathLength={1}
          className="u-draw"
          stroke="currentColor"
          {...STROKE}
        />
        <circle cx="80" cy="42" r="5" className="fill-current" />
      </g>
    </svg>
  )
}

/**
 * Nada que buscar: lupa sobre una lista vacía.
 */
export function IllustrationNoResults({ className = '' }: IllustrationProps) {
  return (
    <svg viewBox="0 0 160 120" className={className} role="presentation" aria-hidden="true">
      {/* Renglones de la lista */}
      <path d="M28 34 H96" pathLength={1} className={MUTED} {...STROKE} />
      <path d="M28 54 H80" pathLength={1} className={MUTED} {...STROKE} />
      <path d="M28 74 H68" pathLength={1} className={MUTED} {...STROKE} />
      <path d="M28 94 H88" pathLength={1} className={MUTED} {...STROKE} />
      {/* Lupa */}
      <g className="u-float">
        <circle
          cx="106"
          cy="62"
          r="24"
          pathLength={1}
          className="u-draw"
          stroke="currentColor"
          {...STROKE}
        />
        <path
          d="M124 80 L142 98"
          pathLength={1}
          className="u-draw"
          stroke="currentColor"
          {...STROKE}
        />
      </g>
    </svg>
  )
}

/**
 * Todo listo: el chulo del logotipo, dibujándose.
 * Se usa cuando no queda trabajo pendiente — no es un vacío triste, es un
 * vacío bueno, y la ilustración lo dice.
 */
export function IllustrationAllDone({ className = '' }: IllustrationProps) {
  return (
    <svg viewBox="0 0 160 120" className={className} role="presentation" aria-hidden="true">
      <path
        d="M8 100 C 40 100, 48 76, 80 76"
        pathLength={1}
        className={`${MUTED} u-travel`}
        {...STROKE}
        strokeWidth={2}
      />
      <circle
        cx="80"
        cy="56"
        r="34"
        pathLength={1}
        className="u-draw"
        stroke="currentColor"
        {...STROKE}
      />
      {/* El chulo del imagotipo, con el mismo ángulo */}
      <path
        d="M64 57 L75 68 L97 44"
        pathLength={1}
        className="u-draw"
        stroke="currentColor"
        {...STROKE}
        strokeWidth={4}
        style={{ animationDelay: '240ms' }}
      />
    </svg>
  )
}
