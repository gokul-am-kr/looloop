'use client'

import { useRef, useState } from 'react'
import { BottomNav } from '@/components/ui/bottom-nav'

// Client-side image compression to ≤800×600 before sending to API
async function compressImage(file: File): Promise<Blob> {
  const MAX_W = 800, MAX_H = 600
  const img   = await createImageBitmap(file)
  const scale = Math.min(1, MAX_W / img.width, MAX_H / img.height)
  const canvas = document.createElement('canvas')
  canvas.width  = Math.round(img.width  * scale)
  canvas.height = Math.round(img.height * scale)
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve, reject) =>
    canvas.toBlob(b => b ? resolve(b) : reject(new Error('compression failed')), 'image/jpeg', 0.82)
  )
}

export default function ScanPage() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview]     = useState<string | null>(null)
  const [file, setFile]           = useState<File | null>(null)
  const [scanning, setScanning]   = useState(false)
  const [result, setResult]       = useState<{ tickCount: number; note: string; scansUsedToday: number } | null>(null)
  const [error, setError]         = useState<string | null>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setResult(null)
    setError(null)
    const url = URL.createObjectURL(f)
    setPreview(url)
  }

  async function handleScan() {
    if (!file || scanning) return
    setScanning(true)
    setError(null)

    try {
      const compressed = await compressImage(file)
      const form = new FormData()
      form.append('image', compressed, 'scan.jpg')

      const res  = await fetch('/api/scan', { method: 'POST', body: form })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Scan failed')
        return
      }

      setResult(data)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setScanning(false)
    }
  }

  function reset() {
    setPreview(null)
    setFile(null)
    setResult(null)
    setError(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <main className="min-h-screen pb-28">
      {/* Header */}
      <div className="px-5 pt-14">
        <p className="text-muted text-xs font-semibold uppercase tracking-widest">Looloop</p>
        <h1 className="text-white text-2xl font-bold mt-1">Scan Journal</h1>
        <p className="text-muted text-sm mt-1">
          Photo your habit grid — we&apos;ll count the ticks for you.
        </p>
      </div>

      <div className="px-5 mt-8 flex flex-col gap-4">

        {/* Upload / preview area */}
        {!preview ? (
          <button
            onClick={() => inputRef.current?.click()}
            className="w-full rounded-2xl flex flex-col items-center justify-center gap-3 py-16 transition-colors"
            style={{ border: '1.5px dashed rgba(255,255,255,0.12)', background: 'rgba(18,18,22,0.52)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}
          >
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <rect x="4" y="8" width="32" height="24" rx="4" stroke="#7A7A86" strokeWidth="1.8" />
              <circle cx="14" cy="16" r="3" stroke="#7A7A86" strokeWidth="1.8" />
              <path d="M4 26l9-7 6 5 5-4 8 7" stroke="#7A7A86" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="text-sm font-medium" style={{ color: '#7A7A86' }}>
              Tap to pick a photo or use camera
            </p>
            <p className="text-xs text-muted">JPEG · PNG · WEBP</p>
          </button>
        ) : (
          <div className="glass relative rounded-2xl overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Journal scan preview" className="w-full object-contain max-h-72" />
            <button
              onClick={reset}
              className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.7)' }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 2l10 10M12 2L2 12" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Scan button */}
        {file && !result && (
          <button
            onClick={handleScan}
            disabled={scanning}
            className="w-full rounded-2xl py-3.5 text-sm font-semibold text-black disabled:opacity-50"
            style={{ background: 'var(--char-accent)' }}
          >
            {scanning ? 'Scanning…' : 'Count my ticks'}
          </button>
        )}

        {/* Error */}
        {error && (
          <div className="bg-card rounded-2xl px-4 py-3">
            <p className="text-sm" style={{ color: '#FF453A' }}>{error}</p>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="glass rounded-2xl px-5 py-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Ticks counted</p>
            <p className="text-6xl font-bold mt-2 leading-none" style={{ color: 'var(--char-accent)' }}>
              {result.tickCount}
            </p>
            {result.note && (
              <p className="text-sm text-muted mt-3 leading-relaxed">{result.note}</p>
            )}
            <p className="text-[10px] text-muted mt-4">
              {result.scansUsedToday}/3 scans used today
            </p>

            <button
              onClick={reset}
              className="glass-elevated mt-4 w-full rounded-xl py-2.5 text-sm font-semibold text-muted"
            >
              Scan another page
            </button>
          </div>
        )}

        {/* Info card */}
        {!result && (
          <div className="glass rounded-2xl px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">How it works</p>
            <ul className="flex flex-col gap-1.5">
              {[
                'Open your Looloop journal to any habit grid page',
                'Take a clear, well-lit photo — landscape works best',
                'We\'ll count every tick, dot, or checkmark',
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-muted">
                  <span className="font-bold shrink-0" style={{ color: 'var(--char-accent)' }}>{i + 1}.</span>
                  {step}
                </li>
              ))}
            </ul>
            <p className="text-[10px] text-muted mt-3">3 scans per day on the free plan</p>
          </div>
        )}
      </div>

      <BottomNav />
    </main>
  )
}
