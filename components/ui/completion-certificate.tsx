'use client'

import { useRef, useState } from 'react'

interface Props {
  charEmoji: string
  charName: string
  totalHabits: number
  totalDaysLogged: number
  bestStreak: number
  totalTicks: number
}

export function CompletionCertificate({ charEmoji, charName, totalHabits, totalDaysLogged, bestStreak, totalTicks }: Props) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [sharing, setSharing] = useState(false)

  const completionPct = Math.round((totalDaysLogged / 90) * 100)
  const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })

  async function handleShare() {
    setSharing(true)
    try {
      const { default: html2canvas } = await import('html2canvas')
      const canvas = await html2canvas(cardRef.current!, { backgroundColor: '#0A0A0A', scale: 2 })
      canvas.toBlob(async blob => {
        if (!blob) return
        const file = new File([blob], 'looloop-certificate.png', { type: 'image/png' })
        if (navigator.share && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: 'I completed 90 days with Looloop!' })
        } else {
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url; a.download = 'looloop-certificate.png'; a.click()
          URL.revokeObjectURL(url)
        }
      }, 'image/png')
    } finally {
      setSharing(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={cardRef}
        className="rounded-2xl px-6 py-7 text-center"
        style={{ background: 'linear-gradient(160deg, #1A0E07 0%, #0A0A0A 60%, #071018 100%)', border: '1px solid #3A2A1A' }}
      >
        {/* Header */}
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">Looloop by Doo Doodle</p>
        <p className="text-[10px] tracking-widest text-muted mt-0.5">Certificate of Completion</p>

        {/* Character */}
        <div className="text-5xl mt-5">{charEmoji}</div>

        {/* Title */}
        <h2 className="text-white text-xl font-bold mt-4 leading-snug">
          90 Days. Closed.
        </h2>
        <p className="text-muted text-xs mt-1.5 leading-relaxed">
          This certifies that you showed up, tracked your habits,<br />
          and closed the loop — one day at a time.
        </p>

        {/* Divider */}
        <div className="my-5 h-px" style={{ background: 'linear-gradient(90deg, transparent, #3A2A1A, transparent)' }} />

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Completion', value: `${completionPct}%` },
            { label: 'Best streak', value: `${bestStreak}d` },
            { label: 'Habits tracked', value: String(totalHabits) },
            { label: 'Total ticks', value: String(totalTicks) },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl py-3 px-2" style={{ background: '#1A1A1C' }}>
              <p className="text-white text-xl font-bold leading-none">{value}</p>
              <p className="text-muted text-[10px] mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-5 pt-4" style={{ borderTop: '1px solid #2C2C2E' }}>
          <p className="text-[10px] text-muted">With {charName} · {today}</p>
          <p className="text-[9px] text-muted mt-0.5">doodoodle.in</p>
        </div>
      </div>

      <button
        onClick={handleShare}
        disabled={sharing}
        className="w-full rounded-2xl py-3 text-sm font-semibold disabled:opacity-50"
        style={{ background: 'var(--char-accent)', color: '#000' }}
      >
        {sharing ? 'Preparing…' : 'Share certificate'}
      </button>
    </div>
  )
}
