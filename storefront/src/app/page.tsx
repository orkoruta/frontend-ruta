import type { Metadata } from 'next'
import { RutaLogo, RutaRouteBackdrop } from '@orkoruta/ui'

/**
 * Landing de RUTA.
 *
 * Público: dueños y operadores de negocios en Colombia que venden y entregan.
 * Trabajo de la página: que entiendan qué resuelve RUTA y pidan una demo.
 *
 * No confundir con las tiendas: cada Cliente vive en `/c/{slug}` y esta página
 * no vende nada. Aquí se contrata el servicio, no se compra producto.
 *
 * **El hilo conductor es la ruta.** La sección "Cómo funciona" es literalmente
 * una ruta vertical con paradas numeradas, y van numeradas porque el ciclo de
 * un pedido *es* una secuencia: el orden es información, no adorno.
 *
 * Todo lo que se afirma aquí existe en el producto. Si se añade una promesa,
 * hay que poder señalar dónde está implementada.
 */

/**
 * Destino de los botones de contacto.
 *
 * No hay captura de leads en la aplicación —no existe endpoint ni tabla—, así
 * que el contacto sale por correo. Un formulario propio necesitaría backend.
 *
 * El asunto y el cuerpo van pre-rellenos para que el interesado no arranque de
 * una hoja en blanco: cuanto más concreto llegue el correo, menos ida y vuelta
 * hace falta para responderle.
 */
const CONTACTO_EMAIL = 'simon.marquez@orko.com.co'

const CONTACTO = `mailto:${CONTACTO_EMAIL}?subject=${encodeURIComponent(
  'Quiero conocer RUTA',
)}&body=${encodeURIComponent(
  [
    'Hola, me interesa RUTA para mi negocio.',
    '',
    'Negocio:',
    'Qué vendo:',
    'Entregas al día (aproximado):',
    'Ciudad:',
    '¿Ya tengo página de ventas?:',
    '',
    'Gracias.',
  ].join('\n'),
)}`

export const metadata: Metadata = {
  title: 'RUTA by ORKO — Vende, despacha y entrega',
  description:
    'Plataforma colombiana de comercio y logística: catálogo, pedidos, reparto con mapa y cobro contra entrega. Para negocios que venden y entregan.',
}

// ── Contenido ────────────────────────────────────────────────────────────────

/** El ciclo real de un pedido, que es lo que la ruta de la página recorre. */
const PASOS = [
  {
    titulo: 'Tu cliente pide',
    texto:
      'Con la tienda en línea que te damos, o desde tu propia web conectada a nuestra API.',
  },
  {
    titulo: 'Confirmas y preparas',
    texto:
      'El pedido entra a tu panel con qué lleva, cuánto vale y a dónde va. Tú decides si lo aceptas.',
  },
  {
    titulo: 'Sale a la calle',
    texto:
      'Asignas repartidor sobre el mapa, viendo quién está libre y por dónde anda el resto de la flota.',
  },
  {
    titulo: 'Entregado y cobrado',
    texto:
      'El repartidor marca la entrega, cobra si es contra entrega y deja foto del recibo como respaldo.',
  },
]

const CAPACIDADES = [
  { titulo: 'Catálogo y pedidos', texto: 'Productos, categorías y carga masiva desde Excel.' },
  { titulo: 'Reparto con mapa', texto: 'Asignación sobre Google Maps y control de cuántos pedidos lleva cada repartidor.' },
  { titulo: 'Cobro contra entrega', texto: 'Efectivo o datáfono, con foto del recibo como evidencia.' },
  { titulo: 'Pago en línea', texto: 'Wompi conectado a tu propia cuenta, no a la nuestra.' },
  { titulo: 'Recogida en punto', texto: 'Puntos físicos con verificación de identidad al entregar.' },
  { titulo: 'Devoluciones y reembolsos', texto: 'El caso completo, desde que el comprador reclama hasta que se cierra.' },
  { titulo: 'Pedidos recurrentes', texto: 'Plantillas que generan el pedido solas cada semana o cada mes.' },
  { titulo: 'Pedidos corporativos', texto: 'Para clientes de empresa que piden por fuera de la tienda.' },
  { titulo: 'API y webhooks', texto: 'Llaves de API y avisos automáticos hacia tus sistemas.' },
]

const MODALIDADES = [
  {
    nombre: 'RUTA completo',
    para: 'Si no tienes plataforma de venta',
    texto:
      'Te damos la tienda en línea, el panel de operación y el reparto. Puedes usar nuestra tienda genérica o pedirnos una con la cara de tu marca.',
    incluye: ['Tienda en línea', 'Panel de pedidos', 'Reparto y cobro', 'Devoluciones y recurrencia'],
  },
  {
    nombre: 'Solo logística',
    para: 'Si ya vendes por tu cuenta',
    texto:
      'Conectas tu plataforma a nuestra API y nosotros nos encargamos de la operación: repartidores, entregas y cobros.',
    incluye: ['API de pedidos', 'Webhooks de estado', 'Reparto y cobro', 'Panel de seguimiento'],
  },
]

// ── Piezas ───────────────────────────────────────────────────────────────────

function Boton({
  href,
  children,
  variant = 'primary',
}: {
  href: string
  children: React.ReactNode
  variant?: 'primary' | 'ghost'
}) {
  const base =
    'u-lift inline-flex items-center justify-center rounded-lg px-5 py-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60'
  const styles =
    variant === 'primary'
      ? 'bg-brand-500 text-white shadow-brand hover:bg-brand-600'
      : 'border border-slate-300 text-slate-700 hover:border-brand-400 hover:text-brand-700 dark:border-white/15 dark:text-slate-300 dark:hover:text-brand-300'
  return (
    <a href={href} className={`${base} ${styles}`}>
      {children}
    </a>
  )
}

function Seccion({
  eyebrow,
  titulo,
  children,
  className = '',
}: {
  eyebrow: string
  titulo: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={`mx-auto w-full max-w-5xl px-6 py-16 sm:py-20 ${className}`}>
      <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-brand-700 dark:text-brand-400">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">{titulo}</h2>
      <div className="mt-8">{children}</div>
    </section>
  )
}

// ── Página ───────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#f3f4f6] text-slate-950 dark:bg-[#111214] dark:text-slate-100">
      {/* ── Portada ── */}
      <header className="relative isolate overflow-hidden">
        <RutaRouteBackdrop variant="flow" />

        <div className="mx-auto flex max-w-5xl flex-col items-start px-6 py-20 sm:py-28">
          <RutaLogo className="u-in h-auto w-44 text-brand-500" />

          <h1 className="u-in mt-8 max-w-2xl text-3xl font-black leading-[1.1] tracking-tight sm:text-5xl">
            Vende, despacha y entrega
            <span className="text-brand-600 dark:text-brand-400">.</span>
            <br />
            Sin pegar cinco herramientas.
          </h1>

          <p className="u-in mt-5 max-w-xl text-base text-slate-600 dark:text-slate-400 sm:text-lg">
            RUTA le da a tu negocio catálogo, pedidos, repartidores y cobros en
            un solo lugar. Tú te encargas de vender; nosotros, de que llegue.
          </p>

          <div className="u-in mt-8 flex flex-wrap gap-3">
            <Boton href={CONTACTO}>Solicitar una demo</Boton>
            <Boton href="#como-funciona" variant="ghost">
              Ver cómo funciona
            </Boton>
          </div>

          <p className="u-in mt-6 text-xs text-slate-500 dark:text-slate-500">
            Hecho en Colombia, para operar en Colombia. Precios en pesos.
          </p>
        </div>
      </header>

      {/* ── Cómo funciona: la ruta, que es el hilo de toda la página ── */}
      <div id="como-funciona" className="border-y border-slate-200/80 bg-white/[0.5] dark:border-white/10 dark:bg-white/[0.02]">
        <Seccion eyebrow="cómo funciona" titulo="El camino de un pedido">
          {/* La línea vertical une las paradas: es la ruta, dibujada. */}
          <ol className="relative ml-3 space-y-10 border-l-2 border-dashed border-brand-400/40 pl-8">
            {PASOS.map((paso, i) => (
              <li key={paso.titulo} className="relative">
                {/* Parada sobre la línea */}
                <span
                  aria-hidden="true"
                  className="absolute -left-[41px] flex h-6 w-6 items-center justify-center rounded-full bg-brand-500 text-[11px] font-black text-white shadow-brand"
                >
                  {i + 1}
                </span>
                <h3 className="text-base font-bold">{paso.titulo}</h3>
                <p className="mt-1 max-w-xl text-sm text-slate-600 dark:text-slate-400">
                  {paso.texto}
                </p>
              </li>
            ))}
          </ol>
        </Seccion>
      </div>

      {/* ── Principio financiero: el diferenciador real ── */}
      <Seccion eyebrow="lo que nos diferencia" titulo="Tu dinero no pasa por nosotros">
        <div className="rounded-xl border border-brand-400/30 bg-brand-500/[0.07] p-6 sm:p-8">
          <p className="max-w-2xl text-base text-slate-700 dark:text-slate-300">
            Los pagos en línea entran directo a <strong>tu</strong> cuenta de
            Wompi. El efectivo del contra entrega es tuyo desde que el repartidor
            lo recibe. RUTA registra la operación y te deja la evidencia, pero
            no custodia el dinero, no lo transfiere y no te lo retiene.
          </p>
          <p className="mt-3 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            Esto no es una política que podamos cambiar mañana: la plataforma
            está construida sin la capacidad de mover fondos.
          </p>
        </div>
      </Seccion>

      {/* ── Capacidades ── */}
      <div className="border-y border-slate-200/80 bg-white/[0.5] dark:border-white/10 dark:bg-white/[0.02]">
        <Seccion eyebrow="qué incluye" titulo="Lo que ya está construido">
          <div className="u-stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CAPACIDADES.map((c) => (
              <div
                key={c.titulo}
                className="u-lift rounded-xl border border-slate-200/80 bg-white/[0.76] p-5 dark:border-white/10 dark:bg-[#1d2025]/[0.78]"
              >
                <h3 className="text-sm font-bold">{c.titulo}</h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{c.texto}</p>
              </div>
            ))}
          </div>
        </Seccion>
      </div>

      {/* ── Modalidades ── */}
      <Seccion eyebrow="dos formas de trabajar" titulo="Según lo que ya tengas">
        <div className="u-stagger grid gap-5 md:grid-cols-2">
          {MODALIDADES.map((m) => (
            <div
              key={m.nombre}
              className="u-lift flex flex-col rounded-xl border border-slate-200/80 bg-white/[0.76] p-6 dark:border-white/10 dark:bg-[#1d2025]/[0.78]"
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand-700 dark:text-brand-400">
                {m.para}
              </p>
              <h3 className="mt-2 text-lg font-black tracking-tight">{m.nombre}</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{m.texto}</p>
              <ul className="mt-4 space-y-1.5">
                {m.incluye.map((i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                    <span aria-hidden="true" className="mt-[2px] font-black text-brand-500">
                      ✓
                    </span>
                    {i}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Seccion>

      {/* ── Cierre ── */}
      <section className="relative isolate overflow-hidden border-t border-slate-200/80 dark:border-white/10">
        <RutaRouteBackdrop variant="flow" className="text-brand-500/[0.12]" />
        <div className="mx-auto max-w-5xl px-6 py-20 text-center">
          <h2 className="text-2xl font-black tracking-tight sm:text-3xl">
            Cuéntanos qué vendes y cómo entregas
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-slate-600 dark:text-slate-400">
            Te mostramos la plataforma con tu operación encima y te decimos con
            franqueza si te sirve.
          </p>
          <div className="mt-8 flex justify-center">
            <Boton href={CONTACTO}>Solicitar una demo</Boton>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200/80 py-8 dark:border-white/10">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 px-6 sm:flex-row sm:justify-between">
          <RutaLogo className="h-auto w-24 text-brand-500" />
          <p className="text-xs text-slate-500 dark:text-slate-500">
            RUTA by ORKO · Bogotá, Colombia
          </p>
        </div>
      </footer>
    </main>
  )
}
