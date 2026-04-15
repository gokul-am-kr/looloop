import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import type { Edition } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { code } = await req.json() as { code?: string }
    if (!code?.trim()) return NextResponse.json({ error: 'No code provided' }, { status: 400 })

    // Fetch the QR code record
    const { data: qr, error: qrErr } = await supabase
      .from('qr_codes')
      .select('id, edition, used, used_by')
      .eq('code', code.trim().toUpperCase())
      .single()

    if (qrErr || !qr) {
      return NextResponse.json({ error: 'Invalid activation code' }, { status: 404 })
    }

    if (qr.used) {
      // Allow same user to re-activate their own code (idempotent)
      if (qr.used_by === user.id) {
        const { data: existing } = await supabase
          .from('premium_access')
          .select('expires_at')
          .eq('user_id', user.id)
          .eq('source', 'qr')
          .order('expires_at', { ascending: false })
          .limit(1)
          .single()
        return NextResponse.json({ already: true, expires_at: existing?.expires_at })
      }
      return NextResponse.json({ error: 'This code has already been used' }, { status: 409 })
    }

    // Mark code as used
    await supabase
      .from('qr_codes')
      .update({ used: true, used_by: user.id, used_at: new Date().toISOString() })
      .eq('id', qr.id)

    // Grant 90 days of premium
    const expiresAt = new Date(Date.now() + 90 * 86_400_000).toISOString()
    await supabase.from('premium_access').insert({
      user_id:         user.id,
      source:          'qr',
      expires_at:      expiresAt,
      journal_edition: qr.edition as Edition,
    })

    return NextResponse.json({ success: true, expires_at: expiresAt, edition: qr.edition })
  } catch (err) {
    console.error('Activate API error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
