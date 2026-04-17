'use client'

import { useEffect, useRef, useState } from 'react'

const CHAR_EMOJI: Record<string, string> = {
  mochi: '🐱',
  pico:  '🌵',
  jelli: '🪼',
  inko:  '🐙',
}

interface Message { role: 'user' | 'assistant'; content: string }

interface Props {
  edition:  string
  charName: string
  streak:   number
}

export function CharacterChat({ edition, charName, streak }: Props) {
  const [open, setOpen]                 = useState(false)
  const [messages, setMessages]         = useState<Message[]>([])
  const [input, setInput]               = useState('')
  const [loading, setLoading]           = useState(false)
  const [greeted, setGreeted]           = useState(false)
  const [limitReached, setLimitReached] = useState(false)
  const [usedToday, setUsedToday]       = useState(0)
  const [error, setError]               = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)
  const emoji     = CHAR_EMOJI[edition] ?? '🐱'

  async function sendMessage(userText: string) {
    if (loading || limitReached) return
    const next: Message[] = [...messages, { role: 'user', content: userText }]
    setMessages(next)
    setInput('')
    setError(null)
    setLoading(true)

    try {
      const res  = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ messages: next }),
      })
      const data = await res.json()

      if (res.status === 429 || data.limitReached) {
        setLimitReached(true)
        setLoading(false)
        return
      }
      if (!res.ok || !data.reply) {
        setMessages(prev => prev.slice(0, -1))
        setError('Could not reach character. Try again.')
        setLoading(false)
        return
      }
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
      setUsedToday(prev => prev + 1)
    } catch {
      setMessages(prev => prev.slice(0, -1))
      setError('Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleOpen() {
    setOpen(true)
    if (!greeted) {
      setGreeted(true)
      sendMessage('Hey')
    }
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 300)
  }, [open])

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={handleOpen}
          className="fixed z-40 flex items-center justify-center shadow-lg active:scale-95 transition-transform glass"
          style={{
            bottom: 88,
            left: 20,
            width: 56,
            height: 56,
            borderRadius: '50%',
          }}
          aria-label={`Chat with ${charName}`}
        >
          <span className="text-2xl leading-none">{emoji}</span>
        </button>
      )}

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* Bottom sheet */}
      <div
        className="fixed z-50 left-0 right-0 flex flex-col glass-strong rounded-t-3xl overflow-hidden transition-transform duration-300"
        style={{
          bottom: 0,
          height: '70vh',
          transform: open ? 'translateY(0)' : 'translateY(100%)',
          pointerEvents: open ? 'auto' : 'none',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '24px 24px 0 0',
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
        </div>

        {/* Header */}
        <div className="px-5 py-3 flex items-center gap-3 shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <span className="text-3xl leading-none">{emoji}</span>
          <div className="flex-1">
            <p className="text-white text-sm font-semibold">{charName}</p>
            {streak > 0 && (
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--char-accent)' }}>🔥 {streak}-day streak</p>
            )}
          </div>
          <p className="text-[10px] mr-2" style={{ color: '#7A7A86' }}>{10 - usedToday} left today</p>
          <button
            onClick={() => setOpen(false)}
            className="w-7 h-7 rounded-full flex items-center justify-center glass-elevated"
          >
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
              <path d="M2 2l10 10M12 2L2 12" stroke="#8E8E93" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.role === 'assistant' ? (
                <div
                  className="max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-snug text-white glass-elevated"
                  style={{ borderBottomLeftRadius: 4 }}
                >
                  {m.content}
                </div>
              ) : (
                <div
                  className="max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-snug"
                  style={{
                    background: 'var(--char-accent)',
                    color: '#000',
                    borderBottomRightRadius: 4,
                  }}
                >
                  {m.content}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="px-3 py-2 rounded-2xl glass-elevated" style={{ borderBottomLeftRadius: 4 }}>
                <span className="text-sm" style={{ color: '#7A7A86' }}>···</span>
              </div>
            </div>
          )}

          {limitReached && (
            <p className="text-center text-[11px] py-1" style={{ color: '#7A7A86' }}>
              Daily limit reached — back tomorrow ✌️
            </p>
          )}
          {error && (
            <p className="text-center text-[11px] py-1" style={{ color: '#FF453A' }}>{error}</p>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        {!limitReached && (
          <div className="px-4 pb-8 pt-2 flex gap-2 shrink-0"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && input.trim() && sendMessage(input.trim())}
              placeholder="Say something…"
              className="flex-1 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-muted outline-none glass-elevated"
              style={{ border: 'none' }}
            />
            <button
              onClick={() => input.trim() && sendMessage(input.trim())}
              disabled={!input.trim() || loading}
              className="w-10 h-10 rounded-xl flex items-center justify-center disabled:opacity-40 transition-opacity shrink-0"
              style={{ background: 'var(--char-accent)' }}
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                <path d="M3 10h14M10 3l7 7-7 7" stroke="#000" strokeWidth="1.8"
                  strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </>
  )
}
