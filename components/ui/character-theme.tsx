'use client'

// Sets CSS custom properties on <html> based on the user's character edition.
// Renders nothing — purely a side-effect component placed in layout.

import { useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { palettes } from '@/lib/characters'
import type { Edition } from '@/types'

function applyPalette(edition: string) {
  const p = palettes[edition as Edition] ?? palettes.mochi
  const root = document.documentElement
  root.style.setProperty('--char-accent',   p.accent)
  root.style.setProperty('--char-accent10', p.accent10)
  root.style.setProperty('--char-accent22', p.accent22)
  root.style.setProperty('--char-orb1',     p.orb1)
  root.style.setProperty('--char-orb2',     p.orb2)
  root.style.setProperty('--char-orb3',     p.orb3)
}

export function CharacterTheme() {
  useEffect(() => {
    const supabase = createBrowserClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('users').select('edition').eq('id', user.id).single()
        .then(({ data }) => {
          if (data?.edition) applyPalette(data.edition)
        })
    })
  }, [])

  return null
}
