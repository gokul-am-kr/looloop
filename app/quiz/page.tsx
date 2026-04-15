'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import { type Edition } from '@/types'
import { characters } from '@/lib/characters'

interface Option { label: string; edition: Edition }
interface Question { text: string; options: Option[] }

const questions: Question[] = [
  {
    text: "What's your biggest goal for the next 90 days?",
    options: [
      { label: "Build a daily routine I actually stick to", edition: 'mochi' },
      { label: "Prove to myself I can be consistent", edition: 'pico' },
      { label: "Sleep better and feel more rested", edition: 'jelli' },
      { label: "Learn something new or level up a skill", edition: 'inko' },
    ],
  },
  {
    text: "When you miss a day, you…",
    options: [
      { label: "Feel a little sad, but try again tomorrow", edition: 'mochi' },
      { label: "Note it and move on — one miss isn't failure", edition: 'pico' },
      { label: "Lie awake thinking about it", edition: 'jelli' },
      { label: "Analyse what went wrong and adjust", edition: 'inko' },
    ],
  },
  {
    text: "Your ideal morning looks like…",
    options: [
      { label: "A slow cup of tea and a small habit ticked off", edition: 'mochi' },
      { label: "Exactly the same as yesterday. Consistency is comfort", edition: 'pico' },
      { label: "Waking up naturally after a full night's sleep", edition: 'jelli' },
      { label: "Reading something interesting before anyone else is up", edition: 'inko' },
    ],
  },
  {
    text: "Pick a vibe:",
    options: [
      { label: "Cosy corner, soft light, warm drink", edition: 'mochi' },
      { label: "Clean desk, no distractions, get it done", edition: 'pico' },
      { label: "Floating, unhurried, peaceful", edition: 'jelli' },
      { label: "Buzzing with ideas, scribbling notes", edition: 'inko' },
    ],
  },
  {
    text: "Motivation for you comes from…",
    options: [
      { label: "Seeing small daily progress add up", edition: 'mochi' },
      { label: "The fact that you said you would", edition: 'pico' },
      { label: "Feeling good in your body and mind", edition: 'jelli' },
      { label: "Understanding the why behind what you're doing", edition: 'inko' },
    ],
  },
  {
    text: "Your relationship with routines?",
    options: [
      { label: "I love them — they make me feel grounded", edition: 'mochi' },
      { label: "I don't call them routines. I call them systems", edition: 'pico' },
      { label: "I try, but sleep and energy get in the way", edition: 'jelli' },
      { label: "I have study routines, less so for everything else", edition: 'inko' },
    ],
  },
  {
    text: "You'd describe yourself as…",
    options: [
      { label: "Gentle and steady", edition: 'mochi' },
      { label: "Quietly determined", edition: 'pico' },
      { label: "Dreamy but deep", edition: 'jelli' },
      { label: "Endlessly curious", edition: 'inko' },
    ],
  },
]

const characterDetails: Record<Edition, { emoji: string; tagline: string }> = {
  mochi: { emoji: '🐱', tagline: 'Warm, curious, quietly proud of every step you take.' },
  pico:  { emoji: '🌵', tagline: 'Dry, deadpan, and always there — even when you think no one notices.' },
  jelli: { emoji: '🪼', tagline: 'Dreamy, soft, and never judgmental about your sleep.' },
  inko:  { emoji: '🐙', tagline: 'Chatty, curious, and thrilled by every fact you learn.' },
}

function tally(answers: Edition[]): Edition {
  const counts: Record<Edition, number> = { mochi: 0, pico: 0, jelli: 0, inko: 0 }
  for (const a of answers) counts[a]++
  return (Object.keys(counts) as Edition[]).reduce((a, b) => counts[a] >= counts[b] ? a : b)
}

export default function QuizPage() {
  const router = useRouter()
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<Edition[]>([])
  const [result, setResult] = useState<Edition | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleAnswer(edition: Edition) {
    const next = [...answers, edition]
    if (current + 1 < questions.length) {
      setAnswers(next)
      setCurrent(current + 1)
    } else {
      setResult(tally(next))
    }
  }

  async function handleConfirm() {
    if (!result) return
    setSaving(true)
    setError(null)
    const supabase = createBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }
    const { error: err } = await supabase
      .from('users')
      .upsert({ id: user.id, email: user.email, edition: result })
    if (err) { setError('Something went wrong. Try again.'); setSaving(false); return }
    router.push('/dashboard')
  }

  // Result screen
  if (result) {
    const character = characters[result]
    const details = characterDetails[result]

    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-10">
            <div className="text-7xl mb-6">{details.emoji}</div>
            <h2 className="text-2xl font-bold text-white">You got {character.name}</h2>
            <p className="mt-2 text-sm text-muted leading-relaxed">{details.tagline}</p>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={handleConfirm}
              disabled={saving}
              className="w-full rounded-2xl py-3.5 text-sm font-semibold text-black disabled:opacity-40 transition-opacity"
              style={{ background: 'var(--char-accent)' }}
            >
              {saving ? 'Setting up…' : `Start with ${character.name.split(' ')[0]}`}
            </button>
            <a
              href="https://doodoodle.in"
              target="_blank"
              rel="noopener noreferrer"
              className="glass w-full rounded-2xl py-3.5 text-sm font-medium text-center block transition-opacity"
              style={{ color: '#8E8E93' }}
            >
              Get the physical journal ↗
            </a>
          </div>

          {error && <p className="mt-3 text-sm text-center" style={{ color: '#FF453A' }}>{error}</p>}
        </div>
      </main>
    )
  }

  const question = questions[current]

  return (
    <main className="flex min-h-screen flex-col justify-center px-6">
      <div className="w-full max-w-sm mx-auto">
        {/* Progress */}
        <div className="mb-10">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs text-muted">{current + 1} / {questions.length}</span>
          </div>
          <div className="h-px w-full" style={{ background: '#2C2C2E' }}>
            <div
              className="h-px transition-all duration-500"
              style={{ width: `${(current / questions.length) * 100}%`, background: 'var(--char-accent)' }}
            />
          </div>
        </div>

        <h2 className="text-xl font-semibold text-white leading-snug">{question.text}</h2>

        <div className="mt-6 flex flex-col gap-2">
          {question.options.map((option) => (
            <button
              key={option.edition}
              onClick={() => handleAnswer(option.edition)}
              className="glass w-full rounded-2xl px-4 py-4 text-left text-sm text-white transition-all active:scale-[0.98]"
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </main>
  )
}
