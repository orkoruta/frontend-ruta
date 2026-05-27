import { RutaCard, RutaButton, RutaPill, RutaSectionHeader, RutaThemeToggle } from '@orkoruta/ui'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#f3f4f6] dark:bg-[#111214] p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            RUTA Admin — Design System
          </h1>
          <RutaThemeToggle />
        </div>

        <RutaCard>
          <RutaSectionHeader title="Componentes base" subtitle="design system" />
          <div className="flex flex-wrap gap-2">
            <RutaButton variant="primary">Asignar ruta</RutaButton>
            <RutaButton variant="success">Confirmar</RutaButton>
            <RutaButton variant="warning">En espera</RutaButton>
            <RutaButton variant="danger">Cancelar</RutaButton>
            <RutaButton variant="secondary">Ver detalle</RutaButton>
            <RutaButton variant="neutral">Exportar</RutaButton>
          </div>
        </RutaCard>

        <RutaCard>
          <RutaSectionHeader title="Estados de pedido" subtitle="pills" />
          <div className="flex flex-wrap gap-2">
            <RutaPill variant="slate">Borrador</RutaPill>
            <RutaPill variant="violet">Validado</RutaPill>
            <RutaPill variant="blue">En tránsito</RutaPill>
            <RutaPill variant="amber">En espera</RutaPill>
            <RutaPill variant="green">Entregado</RutaPill>
            <RutaPill variant="red">Cancelado</RutaPill>
          </div>
        </RutaCard>

        <RutaCard>
          <RutaSectionHeader title="Tamaños de botón" subtitle="variantes" />
          <div className="flex flex-wrap items-center gap-2">
            <RutaButton variant="primary" size="sm">Pequeño</RutaButton>
            <RutaButton variant="primary" size="md">Mediano</RutaButton>
            <RutaButton variant="primary" size="lg">Grande</RutaButton>
          </div>
        </RutaCard>
      </div>
    </main>
  )
}
