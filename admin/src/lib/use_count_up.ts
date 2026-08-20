'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Cuenta desde 0 hasta `target` al montar.
 *
 * Sirve para que una métrica no aparezca de golpe: el número subiendo dice
 * "esto se acaba de calcular" y da un instante para leer la etiqueta. Se apoya
 * en `requestAnimationFrame`, así que se detiene solo si la pestaña pasa a
 * segundo plano.
 *
 * Respeta `prefers-reduced-motion`: si la persona pidió menos movimiento,
 * devuelve el valor final desde el primer render, sin animar.
 */
export function useCountUp(target: number, durationMs = 700): number {
  const [value, setValue] = useState(() => (prefersReducedMotion() ? target : 0))
  const frameRef = useRef<number | null>(null)

  useEffect(() => {
    if (prefersReducedMotion() || !Number.isFinite(target)) {
      setValue(target)
      return
    }

    const start = performance.now()

    function tick(now: number) {
      const t = Math.min((now - start) / durationMs, 1)
      // Misma curva de salida que el resto de la app: rápido y se posa.
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(target * eased)
      if (t < 1) frameRef.current = requestAnimationFrame(tick)
    }

    frameRef.current = requestAnimationFrame(tick)
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    }
  }, [target, durationMs])

  return value
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
