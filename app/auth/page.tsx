'use client'

import { useState } from 'react'
import Image from 'next/image'
import { createBrowserClient } from '@/lib/supabase'

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null)
  const [inputFocused, setInputFocused] = useState(false)

  const supabase = createBrowserClient()
  const isDev = process.env.NODE_ENV === 'development'

  async function handleDevLogin() {
    setLoading(true)
    setError(null)
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: 'gokulk975@gmail.com',
      password: 'devlocal123',
    })
    if (signInError) { setError(signInError.message) } else { window.location.href = '/dashboard' }
    setLoading(false)
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback` },
    })
    if (signInError) { setError(signInError.message) } else { setSubmitted(true) }
    setLoading(false)
  }

  async function handleOAuth(provider: 'google' | 'apple') {
    setOauthLoading(provider)
    setError(null)
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback` },
    })
    if (oauthError) { setError(oauthError.message); setOauthLoading(null) }
  }

  if (submitted) {
    return (
      <main style={pageStyle}>
        <Orbs />
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 360, padding: '0 28px' }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, margin: '0 auto 24px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(145deg, rgba(255,255,255,0.13), rgba(255,255,255,0.04))',
            borderTop: '0.5px solid rgba(255,255,255,0.28)',
            borderLeft: '0.5px solid rgba(255,255,255,0.18)',
            borderRight: '0.5px solid rgba(255,255,255,0.05)',
            borderBottom: '0.5px solid rgba(255,255,255,0.05)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M3 8l7.89 5.26a2 2 0 0 0 2.22 0L21 8M5 19h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2z"
                stroke="rgba(255,255,255,0.6)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
              />
            </svg>
          </div>
          <p style={{ fontSize: 20, fontWeight: 600, color: '#ffffff', fontFamily: "'DM Sans', sans-serif", margin: 0 }}>
            Check your email
          </p>
          <p style={{ marginTop: 8, fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif" }}>
            We sent a magic link to <span style={{ color: '#ffffff' }}>{email}</span>
          </p>
        </div>
      </main>
    )
  }

  const busy = oauthLoading !== null || loading

  return (
    <main style={{ ...pageStyle, flexDirection: 'column' }}>
      <Orbs />

      {/* Centered column — constrains to mobile width on desktop */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        maxWidth: 420,
        margin: '0 auto',
        position: 'relative',
        zIndex: 1,
      }}>

      {/* Hero — logo + brand name */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 28px 40px',
      }}>
        <LogoIcon />
        <h1 style={{
          fontFamily: "'Nunito', sans-serif",
          fontSize: 54,
          fontWeight: 800,
          color: '#ffffff',
          letterSpacing: '-0.01em',
          lineHeight: 1,
          textAlign: 'center',
          margin: '0 0 8px',
          textShadow: 'var(--logo-shadow)',
        }}>
          looloop
        </h1>
        <p style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 13,
          fontWeight: 300,
          color: 'rgba(255,255,255,0.38)',
          letterSpacing: '0.06em',
          textAlign: 'center',
          margin: 0,
        }}>
          by doodoodle
        </p>
      </div>

      {/* Buttons */}
      <div style={{
        padding: '0 28px 40px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}>
        {isDev && (
          <button
            type="button"
            onClick={handleDevLogin}
            disabled={busy}
            style={{
              width: '100%',
              borderRadius: 16,
              padding: '13px 20px',
              border: '1px dashed rgba(255,159,10,0.5)',
              background: 'rgba(255,159,10,0.08)',
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 12,
              color: '#FF9F0A',
              cursor: busy ? 'not-allowed' : 'pointer',
              opacity: busy ? 0.4 : 1,
            }}
          >
            {loading ? 'Signing in…' : 'Dev login — gokulk975@gmail.com'}
          </button>
        )}

        {/* Google */}
        <button
          onClick={() => handleOAuth('google')}
          disabled={busy}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            borderRadius: 16,
            padding: '16px 20px',
            background: 'linear-gradient(145deg, rgba(255,255,255,0.13), rgba(255,255,255,0.06))',
            border: 'none',
            borderTop: '0.5px solid rgba(255,255,255,0.28)',
            borderLeft: '0.5px solid rgba(255,255,255,0.18)',
            borderRight: '0.5px solid rgba(255,255,255,0.05)',
            borderBottom: '0.5px solid rgba(255,255,255,0.05)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.50), 0 2px 8px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.12)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            cursor: busy ? 'not-allowed' : 'pointer',
            width: '100%',
            opacity: busy ? 0.4 : 1,
            transition: 'opacity 0.2s',
          }}
        >
          <GoogleIcon />
          <span style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 15,
            fontWeight: 500,
            color: '#ffffff',
          }}>
            {oauthLoading === 'google' ? 'Redirecting…' : 'Continue with Google'}
          </span>
        </button>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, height: '0.5px', background: 'rgba(255,255,255,0.10)' }} />
          <span style={{
            fontSize: 11,
            color: 'rgba(255,255,255,0.25)',
            letterSpacing: '0.05em',
            fontFamily: "'DM Sans', sans-serif",
          }}>or</span>
          <div style={{ flex: 1, height: '0.5px', background: 'rgba(255,255,255,0.10)' }} />
        </div>

        {/* Email + magic link */}
        <form onSubmit={handleMagicLink} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{
            borderRadius: 14,
            background: 'rgba(255,255,255,0.06)',
            borderTop: inputFocused
              ? '0.5px solid hsla(var(--hue),70%,80%,0.4)'
              : '0.5px solid rgba(255,255,255,0.16)',
            borderLeft: inputFocused
              ? '0.5px solid hsla(var(--hue),70%,80%,0.25)'
              : '0.5px solid rgba(255,255,255,0.10)',
            borderRight: '0.5px solid rgba(255,255,255,0.03)',
            borderBottom: '0.5px solid rgba(255,255,255,0.03)',
            boxShadow: inputFocused
              ? '0 4px 20px rgba(0,0,0,0.4), 0 0 0 1px hsla(var(--hue),70%,80%,0.15), inset 0 1px 0 rgba(255,255,255,0.08)'
              : '0 4px 20px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.06)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            transition: 'border-color 0.2s, box-shadow 0.2s',
          }}>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              placeholder="your@email.com"
              className="auth-email-input"
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                padding: '16px 18px',
                fontSize: 14,
                color: '#ffffff',
                fontFamily: "'DM Sans', sans-serif",
                width: '100%',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            style={{
              width: '100%',
              borderRadius: 16,
              padding: '17px 20px',
              border: 'none',
              cursor: busy ? 'not-allowed' : 'pointer',
              background: 'linear-gradient(135deg, hsl(var(--hue), 72%, 68%), hsl(var(--hue), 62%, 50%))',
              boxShadow: '0 10px 40px hsla(var(--hue),70%,52%,0.50), 0 2px 8px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.22)',
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 15,
              fontWeight: 500,
              color: '#ffffff',
              letterSpacing: '0.03em',
              opacity: busy ? 0.4 : 1,
              transition: 'opacity 0.2s',
            }}
          >
            {loading ? 'Sending…' : 'Send magic link'}
          </button>
        </form>

        {error && (
          <p style={{
            fontSize: 13,
            textAlign: 'center',
            color: '#FF453A',
            fontFamily: "'DM Sans', sans-serif",
            margin: 0,
          }}>
            {error}
          </p>
        )}

        <p style={{
          textAlign: 'center',
          fontSize: 10,
          color: 'rgba(255,255,255,0.16)',
          lineHeight: 1.6,
          fontFamily: "'DM Sans', sans-serif",
          marginTop: 4,
          marginBottom: 0,
        }}>
          By continuing you agree to our Terms &amp; Privacy Policy
        </p>
      </div>
      </div>{/* end centered column */}
    </main>
  )
}

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: 'hsl(var(--hue), 45%, 7%)',
  display: 'flex',
  position: 'relative',
  overflow: 'clip',
}

function Orbs() {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
      <div style={{
        position: 'absolute',
        width: 340, height: 340,
        borderRadius: '50%',
        background: 'hsl(var(--hue), 55%, 55%)',
        opacity: 0.70,
        filter: 'blur(80px)',
        top: -120, left: -60,
      }} />
      <div style={{
        position: 'absolute',
        width: 260, height: 260,
        borderRadius: '50%',
        background: 'hsl(var(--hue), 50%, 40%)',
        opacity: 0.50,
        filter: 'blur(70px)',
        top: 60, right: -80,
      }} />
      <div style={{
        position: 'absolute',
        width: 200, height: 200,
        borderRadius: '50%',
        background: 'hsl(var(--hue), 45%, 68%)',
        opacity: 0.25,
        filter: 'blur(90px)',
        top: 180, left: -40,
      }} />
    </div>
  )
}

function LogoIcon() {
  return (
    <Image
      src="/doodoodle-logo.svg"
      alt="Doo Doodle logo"
      width={72}
      height={72}
      unoptimized
      style={{
        marginBottom: 16,
        opacity: 0.95,
        filter: [
          'invert(1)',
          'drop-shadow(0 0 20px hsla(var(--hue),80%,80%,0.5))',
          'drop-shadow(0 0 40px hsla(var(--hue),70%,70%,0.3))',
        ].join(' '),
      }}
    />
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853" />
      <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05" />
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 6.293C4.672 4.166 6.656 3.58 9 3.58z" fill="#EA4335" />
    </svg>
  )
}

// AppleIcon reserved for future Apple Sign In (required by App Store alongside any social login)
