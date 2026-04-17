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
              className="flex-1 flex flex-col items-center gap-1.5 transition-all active:scale-95"
              style={{
                borderRadius: 16,
                padding: '10px 8px',
                opacity: saving && mood !== m ? 0.5 : 1,
                background: active
                  ? 'linear-gradient(135deg, rgba(255,255,255,0.16), rgba(255,255,255,0.06))'
                  : 'rgba(255,255,255,0.06)',
                borderTop: active ? '0.5px solid rgba(255,255,255,0.30)' : '0.5px solid rgba(255,255,255,0.12)',
                borderLeft: active ? '0.5px solid rgba(255,255,255,0.18)' : '0.5px solid rgba(255,255,255,0.12)',
                borderRight: active ? '0.5px solid rgba(255,255,255,0.05)' : '0.5px solid rgba(255,255,255,0.12)',
                borderBottom: active ? '0.5px solid rgba(255,255,255,0.05)' : '0.5px solid rgba(255,255,255,0.12)',
                boxShadow: active
                  ? '0 6px 20px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.15)'
                  : '0 4px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)',
              }}
            >
              <span className="text-xl leading-none">{MOOD_EMOJI[m]}</span>
              <span className="text-[9px]" style={{
                color: active ? 'var(--accent)' : 'rgba(255,255,255,0.4)',
                fontWeight: active ? 500 : 400,
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
