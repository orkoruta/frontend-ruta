'use client'

/**
 * Captura de la foto del recibo con la cámara del dispositivo.
 *
 * `<input capture>` solo abre la cámara en móvil; en escritorio degrada a un
 * selector de archivos. Aquí se usa getUserMedia para tomar la foto dentro de
 * la página en ambos casos, con el selector de archivos como último recurso
 * (permiso denegado, sin cámara, o contexto no seguro).
 *
 * getUserMedia exige contexto seguro: funciona en localhost y en producción
 * bajo HTTPS.
 */

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react'

interface ReceiptCaptureProps {
  file: File | null
  onCapture: (file: File | null) => void
}

type Mode = 'idle' | 'starting' | 'live' | 'preview' | 'unavailable'

/** Lado mayor de la foto enviada, en píxeles. */
const MAX_CAPTURE_DIMENSION = 1280
const CAPTURE_QUALITY = 0.7

/** Reduce una imagen ya existente al mismo tamaño que las de la cámara. */
function downscaleImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()

    image.onload = () => {
      const scale = Math.min(1, MAX_CAPTURE_DIMENSION / Math.max(image.width, image.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(image.width * scale)
      canvas.height = Math.round(image.height * scale)
      canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('No pudimos procesar la imagen.'))
            return
          }
          resolve(new File([blob], `recibo-${Date.now()}.jpg`, { type: 'image/jpeg' }))
        },
        'image/jpeg',
        CAPTURE_QUALITY,
      )
    }

    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('No pudimos leer la imagen.'))
    }

    image.src = url
  })
}

export default function ReceiptCapture({ file, onCapture }: ReceiptCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [mode, setMode] = useState<Mode>('idle')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  /** Apagar la cámara: si no, el indicador del dispositivo se queda encendido. */
  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }, [])

  useEffect(() => stopCamera, [stopCamera])

  // Revoca la URL anterior para no acumular blobs en memoria.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  async function startCamera() {
    setError(null)
    setMode('starting')

    if (!navigator.mediaDevices?.getUserMedia) {
      setMode('unavailable')
      setError('Este navegador no permite usar la cámara.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        // Cámara trasera en el teléfono del repartidor; en escritorio se ignora.
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      })
      streamRef.current = stream
      setMode('live')

      // El <video> se monta con el estado 'live', así que se asigna después.
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          void videoRef.current.play()
        }
      })
    } catch {
      stopCamera()
      setMode('unavailable')
      setError('No pudimos abrir la cámara. Puedes adjuntar la foto desde el dispositivo.')
    }
  }

  function capture() {
    const video = videoRef.current
    if (!video) return

    // La foto viaja embebida en el JSON del cobro, así que se reduce antes de
    // salir: a resolución completa una cámara de celular produce varios MB y el
    // servidor la rechazaría. 1280 px de lado mayor deja un recibo legible.
    const scale = Math.min(1, MAX_CAPTURE_DIMENSION / Math.max(video.videoWidth, video.videoHeight))

    const canvas = document.createElement('canvas')
    canvas.width = Math.round(video.videoWidth * scale)
    canvas.height = Math.round(video.videoHeight * scale)
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height)

    canvas.toBlob(
      (blob) => {
        if (!blob) return
        const captured = new File([blob], `recibo-${Date.now()}.jpg`, { type: 'image/jpeg' })
        stopCamera()
        setPreviewUrl(URL.createObjectURL(blob))
        setMode('preview')
        onCapture(captured)
      },
      'image/jpeg',
      CAPTURE_QUALITY,
    )
  }

  function retake() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    onCapture(null)
    void startCamera()
  }

  async function handleFallbackFile(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null
    if (!selected) return

    // Una foto elegida de la galería viene a resolución completa; se reduce
    // igual que la de la cámara para que quepa en el cuerpo del cobro.
    let file = selected
    try {
      file = await downscaleImage(selected)
    } catch {
      // Si no se puede procesar (formato raro), se envía tal cual: el límite lo
      // atrapa después con un mensaje claro.
    }

    setPreviewUrl(URL.createObjectURL(file))
    setMode('preview')
    onCapture(file)
  }

  const buttonClass =
    'flex min-h-[48px] w-full items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition-colors'

  return (
    <div className="flex flex-col gap-2">
      {mode === 'live' && (
        <>
          <video
            ref={videoRef}
            playsInline
            muted
            className="w-full rounded-md border border-slate-200 bg-black dark:border-white/10"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={capture}
              className={`${buttonClass} bg-emerald-600 text-white hover:bg-emerald-700`}
            >
              Capturar
            </button>
            <button
              type="button"
              onClick={() => {
                stopCamera()
                setMode('idle')
              }}
              className={`${buttonClass} border border-slate-300 text-slate-600 dark:border-white/10 dark:text-slate-300`}
            >
              Cancelar
            </button>
          </div>
        </>
      )}

      {mode === 'preview' && previewUrl && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- blob local, no pasa por el optimizador */}
          <img
            src={previewUrl}
            alt="Foto del recibo"
            className="w-full rounded-md border border-slate-200 dark:border-white/10"
          />
          <p className="text-xs text-emerald-600 dark:text-emerald-400">
            ✓ Foto lista{file ? ` (${Math.round(file.size / 1024)} KB)` : ''}
          </p>
          <button
            type="button"
            onClick={retake}
            className={`${buttonClass} border border-slate-300 text-slate-600 dark:border-white/10 dark:text-slate-300`}
          >
            Repetir foto
          </button>
        </>
      )}

      {(mode === 'idle' || mode === 'starting') && (
        <button
          type="button"
          onClick={() => void startCamera()}
          disabled={mode === 'starting'}
          className={`${buttonClass} border border-dashed border-slate-300 bg-white/[0.06] text-slate-600 hover:bg-white/[0.12] dark:border-white/10 dark:text-slate-300`}
        >
          <span>📷</span>
          {mode === 'starting' ? 'Abriendo cámara…' : 'Tomar foto del recibo'}
        </button>
      )}

      {mode === 'unavailable' && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={`${buttonClass} border border-dashed border-slate-300 bg-white/[0.06] text-slate-600 hover:bg-white/[0.12] dark:border-white/10 dark:text-slate-300`}
        >
          <span>🖼</span>
          Adjuntar foto del recibo
        </button>
      )}

      {error && <p className="text-xs text-amber-600 dark:text-amber-400">{error}</p>}

      {/* Respaldo: cámara denegada o no disponible. */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(event) => void handleFallbackFile(event)}
        className="hidden"
      />
    </div>
  )
}
