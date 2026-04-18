'use client'

import { useRef, useState } from 'react'
import type { SleepScore } from '@/lib/sleep-score'

interface Props {
  score: SleepScore
  charName: string
  charEmoji: string
  streak: number
}

const GLASS_CARD: React.CSSProperties = {
  background: 'linear-gradient(145deg, rgba(255,255,255,0.11) 0%, rgba(255,255,255,0.04) 60%, rgba(255,255,255,0.02) 100%)',
  borderTop: '0.5px solid rgba(255,255,255,0.24)',
  borderLeft: '0.5px solid rgba(255,255,255,0.16)',
  borderRight: '0.5px solid rgba(255,255,255,0.04)',
  borderBottom: '0.5px solid rgba(255,255,255,0.04)',
  boxShadow: '0 12px 40px rgba(0,0,0,0.55), 0 4px 12px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.12)',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  borderRadius: 18,
}

export function SleepScoreCard({ score, charName, charEmoji, streak }: Props) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [sharing, setSharing] = useState(false)

  async function handleShare() {
    setSharing(true)
    try {
      const { default: html2canvas } = await import('html2canvas')
      const canvas = await html2canvas(cardRef.current!, { backgroundColor: '#0d0b1e', scale: 2 })
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

  const circumference = 2 * Math.PI * 42
  const dashoffset = circumference * (1 - score.total / 100)

  const barColors = [
    'hsl(var(--hue),80%,88%)',
    'hsl(var(--hue),70%,76%)',
    'hsl(var(--hue),60%,66%)',
  ]
  const barGlows = [
    '0 0 8px hsla(var(--hue),80%,88%,0.5)',
    '0 0 6px hsla(var(--hue),70%,78%,0.4)',
    '0 0 6px hsla(var(--hue),60%,68%,0.35)',
  ]

  return (
    <div className="flex flex-col gap-3">
      <div style={GLASS_CARD}>
        <div ref={cardRef} style={{ borderRadius: 17, padding: '20px 20px 16px', background: 'transparent' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <div>
              <p style={{
                fontSize: 9, fontWeight: 600, letterSpacing: '0.12em',
                textTransform: 'uppercase', color: 'var(--accent)',
              }}>Looloop</p>
              <p style={{ color: '#ffffff', fontSize: 15, fontWeight: 500, marginTop: 2 }}>
                Weekly Sleep Score
              </p>
            </div>
            <span style={{ fontSize: 24 }}>{charEmoji}</span>
          </div>

          {/* Score ring + breakdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <svg width={96} height={96} viewBox="0 0 100 100" style={{ flexShrink: 0 }}>
              <circle cx={50} cy={50} r={42} fill="none"
                stroke="rgba(255,255,255,0.08)" strokeWidth={8} />
              <circle
                cx={50} cy={50} r={42}
                fill="none"
                style={{ stroke: 'hsl(var(--hue),80%,88%)' }}
                strokeWidth={8}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashoffset}
                transform="rotate(-90 50 50)"
              />
              <text x={50} y={46} textAnchor="middle"
                fill="#ffffff" fontSize={20} fontWeight="600"
                fontFamily="-apple-system, BlinkMacSystemFont, sans-serif"
              >{score.total}</text>
              <text x={50} y={60} textAnchor="middle"
                style={{ fill: 'var(--accent)' }}
                fontSize={9}
                fontFamily="-apple-system, BlinkMacSystemFont, sans-serif"
              >{score.label}</text>
            </svg>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Duration',    val: score.duration,    max: 40, colorIdx: 0 },
                { label: 'Quality',     val: score.quality,     max: 40, colorIdx: 1 },
                { label: 'Consistency', val: score.consistency, max: 20, colorIdx: 2 },
              ].map(({ label, val, max, colorIdx }) => (
                <div key={label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)' }}>{label}</span>
                    <span style={{ fontSize: 10, fontWeight: 500, color: 'rgba(255,255,255,0.60)' }}>
                      {val}/{max}
                    </span>
                  </div>
                  <div style={{
                    height: 4, borderRadius: 2,
                    background: 'rgba(255,255,255,0.07)',
                    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.4)',
                  }}>
                    <div style={{
                      height: 4, borderRadius: 2,
                      width: `${(val / max) * 100}%`,
                      background: barColors[colorIdx],
                      boxShadow: barGlows[colorIdx],
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stats row */}
          <div style={{
            display: 'flex', gap: 16, marginTop: 18, paddingTop: 14,
            borderTop: '0.5px solid rgba(255,255,255,0.08)',
          }}>
            <div>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)' }}>Avg sleep</p>
              <p style={{ color: '#ffffff', fontSize: 13, fontWeight: 500, marginTop: 2 }}>
                {Math.floor(score.avgHrs)}h {Math.round((score.avgHrs % 1) * 60)}m
              </p>
            </div>
            <div>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)' }}>Avg quality</p>
              <p style={{ color: '#ffffff', fontSize: 13, fontWeight: 500, marginTop: 2 }}>
                {score.avgQuality.toFixed(1)}/5
              </p>
            </div>
            <div>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)' }}>Nights logged</p>
              <p style={{ color: '#ffffff', fontSize: 13, fontWeight: 500, marginTop: 2 }}>
                {score.nightsLogged}/7
              </p>
            </div>
            {streak > 0 && (
              <div>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)' }}>Streak</p>
                <p style={{ fontSize: 13, fontWeight: 500, marginTop: 2, color: 'var(--accent)' }}>
                  🔥 {streak}
                </p>
              </div>
            )}
          </div>

          <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', marginTop: 14 }}>
            {charName} · Looloop by Doo Doodle · doodoodle.in
          </p>
        </div>
      </div>

      <button
        onClick={handleShare}
        disabled={sharing}
        style={{
          width: '100%', borderRadius: 14, padding: '12px 0',
          fontSize: 13, fontWeight: 500,
          background: 'linear-gradient(145deg, rgba(255,255,255,0.10), rgba(255,255,255,0.04))',
          borderTop: '0.5px solid rgba(255,255,255,0.20)',
          borderLeft: '0.5px solid rgba(255,255,255,0.12)',
          borderRight: '0.5px solid rgba(255,255,255,0.04)',
          borderBottom: '0.5px solid rgba(255,255,255,0.04)',
          color: 'rgba(255,255,255,0.65)',
          cursor: sharing ? 'default' : 'pointer',
          opacity: sharing ? 0.5 : 1,
        }}
      >
        {sharing ? 'Preparing…' : 'Share score card'}
      </button>
    </div>
  )
}
