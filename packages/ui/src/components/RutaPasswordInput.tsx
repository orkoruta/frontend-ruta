'use client'

import { useId, useState, type InputHTMLAttributes } from 'react'

/**
 * Campo de contraseña con botón para revelarla.
 *
 * Acepta las mismas props que un `<input>`; el `type` lo controla el propio
 * componente. El botón queda fuera del orden de tabulación para no interrumpir
 * el recorrido con teclado entre los campos del formulario.
 */
type RutaPasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>

export function RutaPasswordInput({ className = '', id, ...props }: RutaPasswordInputProps) {
  const [visible, setVisible] = useState(false)
  const generatedId = useId()
  const inputId = id ?? generatedId

  return (
    <div className="relative">
      <input
        {...props}
        id={inputId}
        type={visible ? 'text' : 'password'}
        // Espacio a la derecha para que el texto no quede debajo del botón.
        className={`${className} pr-10`}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-200"
      >
        {visible ? (
          // Ojo tachado
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.4 5.2A9.5 9.5 0 0112 5c5 0 9 4.5 9 7 0 .9-.5 2-1.4 3.1M6.5 6.9C4.4 8.3 3 10.4 3 12c0 2.5 4 7 9 7 1.4 0 2.6-.3 3.7-.8"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
          </svg>
        ) : (
          // Ojo abierto
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M3 12c0-2.5 4-7 9-7s9 4.5 9 7-4 7-9 7-9-4.5-9-7z"
              stroke="currentColor"
              strokeWidth="1.7"
            />
            <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.7" />
          </svg>
        )}
      </button>
    </div>
  )
}
