'use client'

import { useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { MOOD_EMOJI, MOOD_LABELS } from '@/components/ui/radial-mood-chart'

interface Props {
  userId:       string
  date:         string
  initialMood:  number
}

export function MoodQuickLog({ userId, date, initialMood }: Props) {
  const [mood, setMood]     = useState(initialMood)
  const [saving, setSaving] = useState(false)

  const supabase = createBrowserClient()

  async function tap(m: number) {
    if (saving) return
    setMood(m)
    setSaving(true)
    await supabase.from('mood_logs').upsert(
      { user_id: userId, date, mood: m, note: null },
      { onConflict: 'user_id,date' },
    )
    setSaving(false)
  }

  return (
    <div style={{
      background: 'linear-gradient(145deg, rgba(255,255,255,0.11), rgba(255,255,255,0.04))',
      borderTop: '0.5px solid rgba(255,255,255,0.24)',
      borderLeft: '0.5px solid rgba(255,255,255,0.16)',
      borderRight: '0.5px solid rgba(255,255,255,0.04)',
      borderBottom: '0.5px solid rgba(255,255,255,0.04)',
      boxShadow: '0 12px 40px rgba(0,0,0,0.55), 0 4px 12px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.12)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      borderRadius: 18,
      padding: '16px 18px',
    }}>
      <p style={{
        color: 'var(--accent)',
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        marginBottom: 14,
      }}>Mood</p>

      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map(m => {
          const active = mood === m
          return (
            <button
              key={m}
              onClick={() => tap(m)}
              className="flex-1 flex flex-col items-center gap-1.5 active:scale-95"
              style={{
                borderRadius: 14,
                padding: '10px 6px',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease',
                transform: active ? 'scale(1.08)' : 'scale(1)',
                opacity: saving && !active ? 0.4 : 1,
                background: active ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.04)',
                border: active ? '1px solid rgba(255,255,255,0.45)' : '0.5px solid rgba(255,255,255,0.08)',
                boxShadow: active
                  ? '0 0 0 2px var(--accent-glow), 0 8px 20px rgba(0,0,0,0.50), inset 0 1px 0 rgba(255,255,255,0.30)'
                  : 'none',
              }}
            >
              <span style={{
                fontSize: active ? 24 : 18,
                lineHeight: 1,
                opacity: active ? 1 : 0.55,
                transition: 'font-size 0.15s ease, opacity 0.15s ease',
              }}>{MOOD_EMOJI[m]}</span>
              <span style={{
                fontSize: 9,
                color: active ? '#ffffff' : 'rgba(255,255,255,0.25)',
                fontWeight: active ? 700 : 400,
                transition: 'color 0.15s ease',
              }}>
                {MOOD_LABELS[m]}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
