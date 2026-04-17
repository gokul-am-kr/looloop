'use client'

import { useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { MOOD_COLORS, MOOD_EMOJI, MOOD_LABELS } from '@/components/ui/radial-mood-chart'

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
    <div className="glass rounded-2xl px-5 py-4">
      <p className="text-xs font-medium mb-3" style={{ color: '#BF5AF2' }}>Mood</p>

      <div className="flex justify-between items-center">
        {[1, 2, 3, 4, 5].map(m => {
          const active = mood === m
          const color  = m === 5 ? 'var(--char-accent)' : MOOD_COLORS[m]
          return (
            <button
              key={m}
              onClick={() => tap(m)}
              className="flex flex-col items-center gap-1 transition-all active:scale-90"
              style={{ opacity: saving && mood !== m ? 0.5 : 1 }}
            >
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl transition-all"
                style={{
                  background: active ? `${color}22` : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${active ? `${color}66` : 'rgba(255,255,255,0.06)'}`,
                  boxShadow: active ? `0 0 12px ${color}44` : 'none',
                  transform: active ? 'scale(1.1)' : 'scale(1)',
                }}
              >
                {MOOD_EMOJI[m]}
              </div>
              <span className="text-[9px]" style={{ color: active ? color : '#3A3A48' }}>
                {MOOD_LABELS[m]}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
