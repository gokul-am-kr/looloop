import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from '@/lib/supabase-server'
import { characters } from '@/lib/characters'
import { CLAUDE_MODEL } from '@/lib/claude'
import { computeStreak } from '@/lib/streak'
import type { Edition } from '@/types'

const DAILY_LIMIT = 10

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Check daily message limit
    const today = new Date().toISOString().split('T')[0]
    const { count } = await supabase
      .from('api_usage')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('feature', 'chat')
      .gte('created_at', `${today}T00:00:00`)

    if ((count ?? 0) >= DAILY_LIMIT) {
      return NextResponse.json({ error: 'Daily limit reached', limitReached: true }, { status: 429 })
    }

    const { messages } = await req.json() as {
      messages: { role: 'user' | 'assistant'; content: string }[]
    }
    if (!messages?.length) return NextResponse.json({ error: 'No messages' }, { status: 400 })

    // Fetch user profile + habit log dates for streak
    const [{ data: profile }, { data: habitLogs }] = await Promise.all([
      supabase.from('users').select('edition').eq('id', user.id).single(),
      supabase.from('habit_logs').select('date').eq('user_id', user.id)
        .gte('date', new Date(Date.now() - 90 * 86_400_000).toISOString().split('T')[0])
        .order('date', { ascending: false }),
    ])

    const edition   = (profile?.edition ?? 'mochi') as Edition
    const streak    = computeStreak((habitLogs ?? []).map(l => l.date))
    const character = characters[edition] ?? characters.mochi
    const systemPrompt = character.systemPrompt(streak)

    // Call Claude
    const client   = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
    const response = await client.messages.create({
      model:      CLAUDE_MODEL,
      max_tokens: 120,
      system:     systemPrompt,
      messages,
    })

    const reply = response.content[0].type === 'text' ? response.content[0].text.trim() : '...'

    // Log usage
    await supabase.from('api_usage').insert({
      user_id: user.id,
      feature: 'chat',
      model:   CLAUDE_MODEL,
    })

    return NextResponse.json({ reply, streak, edition })
  } catch (err: unknown) {
    console.error('Chat API error:', err)
    const msg = (err as { error?: { error?: { message?: string } } })?.error?.error?.message
    if (msg?.includes('credit balance')) {
      return NextResponse.json({ error: 'AI service unavailable — billing issue' }, { status: 503 })
    }
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
