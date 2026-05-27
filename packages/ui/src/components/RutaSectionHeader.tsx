interface RutaSectionHeaderProps {
  title: string
  subtitle?: string
  className?: string
}

export function RutaSectionHeader({ title, subtitle, className = '' }: RutaSectionHeaderProps) {
  return (
    <div className={`mb-4 ${className}`}>
      {subtitle && (
        <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400 mb-1">
          {subtitle}
        </p>
      )}
      <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100">
        {title}
      </h2>
    </div>
  )
}
