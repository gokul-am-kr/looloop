import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createServerClient } from '@/lib/supabase-server'

const RAZORPAY_SECRET = process.env.RAZORPAY_KEY_SECRET!

// Verify Razorpay webhook signature
function verifySignature(body: string, signature: string): boolean {
  const expected = crypto
    .createHmac('sha256', RAZORPAY_SECRET)
    .update(body)
    .digest('hex')
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
}

export async function POST(req: NextRequest) {
  const rawBody  = await req.text()
  const signature = req.headers.get('x-razorpay-signature') ?? ''

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  let event: { event: string; payload: { payment: { entity: { id: string; notes: { user_id?: string } } } } }
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Only handle successful payments
  if (event.event !== 'payment.captured') {
    return NextResponse.json({ ok: true })
  }

  const payment = event.payload.payment.entity
  const userId  = payment.notes?.user_id

  if (!userId) {
    console.error('Webhook: payment missing user_id note', payment.id)
    return NextResponse.json({ error: 'Missing user_id' }, { status: 400 })
  }

  const supabase = await createServerClient()

  // Grant 30 days of premium (monthly subscription)
  const expiresAt = new Date(Date.now() + 30 * 86_400_000).toISOString()

  const { error } = await supabase.from('premium_access').insert({
    user_id:         userId,
    source:          'razorpay',
    expires_at:      expiresAt,
    journal_edition: null,
  })

  if (error) {
    console.error('Webhook: failed to insert premium_access', error)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  console.log(`Webhook: premium granted to ${userId} until ${expiresAt}`)
  return NextResponse.json({ ok: true })
}
