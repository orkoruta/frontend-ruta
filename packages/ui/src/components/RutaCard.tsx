interface RutaCardProps {
  children: React.ReactNode
  className?: string
}

export function RutaCard({ children, className = '' }: RutaCardProps) {
  return (
    <div className={`rounded-lg border bg-white/[0.76] border-slate-200/90 shadow-sm p-4 dark:bg-[#1d2025]/[0.78] dark:border-white/10 ${className}`}>
      {children}
    </div>
  )
}
