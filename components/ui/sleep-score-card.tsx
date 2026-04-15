'use client'

import { useRef, useState } from 'react'
import type { SleepScore } from '@/lib/sleep-score'

interface Props {
  score: SleepScore
  charName: string
  charEmoji: string
  streak: number
}

export function SleepScoreCard({ score, charName, charEmoji, streak }: Props) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [sharing, setSharing] = useState(false)

  async function handleShare() {
    setSharing(true)
    try {
      const { default: html2canvas } = await import('html2canvas')
      const canvas = await html2canvas(cardRef.current!, { backgroundColor: '#000', scale: 2 })
      canvas.toBlob(async blob => {
        if (!blob) return
        const file = new File([blob], 'sleep-score.png', { type: 'image/png' })
        if (navigator.share && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: 'My Looloop Sleep Score' })
        } else {
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url; a.download = 'sleep-score.png'; a.click()
          URL.revokeObjectURL(url)
        }
      }, 'image/png')
    } finally {
      setSharing(false)
    }
  }

  const scoreColor =
    score.total >= 85 ? '#5AC8FA' :
    score.total >= 70 ? '#34C759' :
    score.total >= 50 ? '#FF9F0A' :
    '#FF453A'

  const circumference = 2 * Math.PI * 42
  const dashoffset = circumference * (1 - score.total / 100)

  return (
    <div className="flex flex-col gap-3">
      {/* The shareable card */}
      <div
        ref={cardRef}
        className="rounded-2xl px-5 py-6"
        style={{ background: '#111', border: '1px solid #2C2C2E' }}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted">Looloop</p>
            <p className="text-white text-sm font-semibold mt-0.5">Weekly Sleep Score</p>
          </div>
          <span className="text-2xl">{charEmoji}</span>
        </div>

        {/* Score ring */}
        <div className="flex items-center gap-5">
          <svg width={100} height={100} viewBox="0 0 100 100">
            <circle cx={50} cy={50} r={42} fill="none" stroke="#2C2C2E" strokeWidth={8} />
            <circle
              cx={50} cy={50} r={42}
              fill="none"
              stroke={scoreColor}
              strokeWidth={8}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashoffset}
              transform="rotate(-90 50 50)"
            />
            <text x={50} y={46} textAnchor="middle" fill="#fff" fontSize={22} fontWeight="700">{score.total}</text>
            <text x={50} y={60} textAnchor="middle" fill="#8E8E93" fontSize={9}>{score.label}</text>
          </svg>

          {/* Breakdown bars */}
          <div className="flex-1 flex flex-col gap-2.5">
            {[
              { label: 'Duration',    val: score.duration,    max: 40, color: scoreColor },
              { label: 'Quality',     val: score.quality,     max: 40, color: scoreColor },
              { label: 'Consistency', val: score.consistency, max: 20, color: scoreColor },
            ].map(({ label, val, max, color }) => (
              <div key={label}>
                <div className="flex justify-between mb-1">
                  <span className="text-[10px] text-muted">{label}</span>
                  <span className="text-[10px] font-semibold text-white">{val}/{max}</span>
                </div>
                <div className="h-1 rounded-full" style={{ background: '#2C2C2E' }}>
                  <div
                    className="h-1 rounded-full"
                    style={{ width: `${(val / max) * 100}%`, background: color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats row */}
        <div className="flex gap-4 mt-5 pt-4" style={{ borderTop: '1px solid #2C2C2E' }}>
          <div>
            <p className="text-[10px] text-muted">Avg sleep</p>
            <p className="text-white text-sm font-semibold mt-0.5">
              {Math.floor(score.avgHrs)}h {Math.round((score.avgHrs % 1) * 60)}m
            </p>
          </div>
          <div>
            <p className="text-[10px] text-muted">Avg quality</p>
            <p className="text-white text-sm font-semibold mt-0.5">{score.avgQuality.toFixed(1)}/5</p>
          </div>
          <div>
            <p className="text-[10px] text-muted">Nights logged</p>
            <p className="text-white text-sm font-semibold mt-0.5">{score.nightsLogged}/7</p>
          </div>
          {streak > 0 && (
            <div>
              <p className="text-[10px] text-muted">Streak</p>
              <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--char-accent)' }}>🔥 {streak}</p>
            </div>
          )}
        </div>

        <p className="text-[9px] text-muted mt-4">
          {charName} · Looloop by Doo Doodle · doodoodle.in
        </p>
      </div>

      {/* Share button */}
      <button
        onClick={handleShare}
        disabled={sharing}
        className="w-full rounded-2xl py-3 text-sm font-semibold disabled:opacity-50"
        style={{ background: '#2C2C2E', color: '#fff' }}
      >
        {sharing ? 'Preparing…' : 'Share score card'}
      </button>
    </div>
  )
}
