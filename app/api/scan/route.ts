import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from '@/lib/supabase-server'
import { CLAUDE_MODEL } from '@/lib/claude'

const DAILY_SCAN_LIMIT = 3

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Check daily scan limit
    const today = new Date().toISOString().split('T')[0]
    const { count } = await supabase
      .from('api_usage')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('feature', 'scan')
      .gte('created_at', `${today}T00:00:00`)

    if ((count ?? 0) >= DAILY_SCAN_LIMIT) {
      return NextResponse.json(
        { error: `Daily scan limit reached (${DAILY_SCAN_LIMIT}/day)`, limitReached: true },
        { status: 429 },
      )
    }

    const formData = await req.formData()
    const file = formData.get('image') as File | null
    if (!file) return NextResponse.json({ error: 'No image provided' }, { status: 400 })

    // Validate type
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: 'Unsupported image format' }, { status: 400 })
    }

    // Convert to base64 (image already compressed client-side to ≤800×600)
    const bytes   = await file.arrayBuffer()
    const base64  = Buffer.from(bytes).toString('base64')
    const mediaType = file.type as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'

    // Call Claude Vision
    const client   = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
    const response = await client.messages.create({
      model:      CLAUDE_MODEL,
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: base64 },
          },
          {
            type: 'text',
            text: [
              'This is a page from a habit tracker bullet journal.',
              'Count every tick mark, checkmark, dot, or filled cell visible in the habit grid.',
              'Reply with ONLY a valid JSON object — no other text:',
              '{"ticks": <number>, "note": "<one sentence describing what you see>"}',
            ].join(' '),
          },
        ],
      }],
    })

    let tickCount = 0
    let note = ''
    try {
      const raw = response.content[0].type === 'text' ? response.content[0].text : '{}'
      // Strip any markdown code fences Claude might add
      const clean = raw.replace(/```json?|```/g, '').trim()
      const parsed = JSON.parse(clean)
      tickCount = Number(parsed.ticks ?? 0)
      note = String(parsed.note ?? '')
    } catch {
      // Parse failed — tickCount stays 0
    }

    // Save scan result
    await supabase.from('journal_scans').insert({
      user_id:    user.id,
      scan_url:   '',
      tick_count: tickCount,
    })

    // Log usage
    await supabase.from('api_usage').insert({
      user_id: user.id,
      feature: 'scan',
      model:   CLAUDE_MODEL,
    })

    return NextResponse.json({ tickCount, note, scansUsedToday: (count ?? 0) + 1 })
  } catch (err: unknown) {
    console.error('Scan API error:', err)
    const msg = (err as { error?: { error?: { message?: string } } })?.error?.error?.message
    if (msg?.includes('credit balance')) {
      return NextResponse.json({ error: 'AI service unavailable — billing issue' }, { status: 503 })
    }
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
