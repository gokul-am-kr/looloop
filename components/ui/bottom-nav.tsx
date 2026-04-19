'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  {
    href: '/dashboard',
    label: 'Today',
    hardNav: true, // full browser navigation — bypasses Next.js Router Cache
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="7" height="7" rx="1.5"
          fill={active ? '#ffffff' : 'none'} stroke={active ? '#ffffff' : '#8E8E93'} strokeWidth="1.8" />
        <rect x="14" y="3" width="7" height="7" rx="1.5"
          fill={active ? '#ffffff' : 'none'} stroke={active ? '#ffffff' : '#8E8E93'} strokeWidth="1.8" />
        <rect x="3" y="14" width="7" height="7" rx="1.5"
          fill={active ? '#ffffff' : 'none'} stroke={active ? '#ffffff' : '#8E8E93'} strokeWidth="1.8" />
        <rect x="14" y="14" width="7" height="7" rx="1.5"
          fill={active ? '#ffffff' : 'none'} stroke={active ? '#ffffff' : '#8E8E93'} strokeWidth="1.8" />
      </svg>
    ),
  },
  {
    href: '/log/habits',
    label: 'Habits',
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke={active ? '#ffffff' : '#8E8E93'} strokeWidth="1.8" />
        <path d="M8 12l3 3 5-5" stroke={active ? '#ffffff' : '#8E8E93'}
          strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: '/log/sleep',
    label: 'Sleep',
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
          stroke={active ? '#ffffff' : '#8E8E93'} strokeWidth="1.8"
          strokeLinecap="round" fill={active ? 'rgba(255,255,255,0.13)' : 'none'} />
      </svg>
    ),
  },
  {
    href: '/summary',
    label: 'Summary',
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="4" width="18" height="17" rx="2"
          stroke={active ? '#ffffff' : '#8E8E93'} strokeWidth="1.8" />
        <path d="M3 9h18" stroke={active ? '#ffffff' : '#8E8E93'} strokeWidth="1.8" />
        <path d="M8 2v4M16 2v4" stroke={active ? '#ffffff' : '#8E8E93'}
          strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="8"  cy="14" r="1.2" fill={active ? '#ffffff' : '#8E8E93'} />
        <circle cx="12" cy="14" r="1.2" fill={active ? '#ffffff' : '#8E8E93'} />
        <circle cx="16" cy="14" r="1.2" fill={active ? '#ffffff' : '#8E8E93'} />
      </svg>
    ),
  },
  {
    href: '/scan',
    label: 'Scan',
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M4 8V6a2 2 0 0 1 2-2h2" stroke={active ? '#ffffff' : '#8E8E93'}
          strokeWidth="1.8" strokeLinecap="round" />
        <path d="M20 8V6a2 2 0 0 0-2-2h-2" stroke={active ? '#ffffff' : '#8E8E93'}
          strokeWidth="1.8" strokeLinecap="round" />
        <path d="M4 16v2a2 2 0 0 0 2 2h2" stroke={active ? '#ffffff' : '#8E8E93'}
          strokeWidth="1.8" strokeLinecap="round" />
        <path d="M20 16v2a2 2 0 0 1-2 2h-2" stroke={active ? '#ffffff' : '#8E8E93'}
          strokeWidth="1.8" strokeLinecap="round" />
        <path d="M4 12h16" stroke={active ? '#ffffff' : '#8E8E93'}
          strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
]

const ACTIVE_STYLE: React.CSSProperties = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.16), rgba(255,255,255,0.06))',
  borderTop: '0.5px solid rgba(255,255,255,0.30)',
  borderLeft: '0.5px solid rgba(255,255,255,0.18)',
  borderRight: '0.5px solid rgba(255,255,255,0.05)',
  borderBottom: '0.5px solid rgba(255,255,255,0.05)',
  boxShadow: '0 4px 16px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.15)',
  borderRadius: 16,
  padding: '8px 16px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 4,
  textDecoration: 'none',
}

const INACTIVE_STYLE: React.CSSProperties = {
  padding: '8px 10px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 4,
  borderRadius: 16,
  textDecoration: 'none',
}

export function BottomNav() {
  const pathname = usePathname()

  return (
    <div
      className="z-[100] flex items-center"
      style={{
        position: 'fixed',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'fit-content',
        minWidth: 300,
        padding: '10px 16px',
        borderRadius: 28,
        gap: 2,
        background: 'linear-gradient(135deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 100%)',
        border: '0.5px solid rgba(255,255,255,0.15)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.50), 0 2px 8px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.12)',
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
      }}>
      {tabs.map(({ href, label, icon, hardNav }) => {
        const active = pathname === href || pathname.startsWith(href + '/')

        if (hardNav) {
          // Full browser navigation — server always re-renders fresh data
          return (
            <a key={href} href={href}
              style={active ? { ...ACTIVE_STYLE } : { ...INACTIVE_STYLE, color: 'rgba(255,255,255,0.30)' }}>
              {icon(active)}
              <span style={{
                fontSize: 10, fontWeight: 500,
                color: active ? 'var(--accent)' : 'rgba(255,255,255,0.30)',
              }}>{label}</span>
            </a>
          )
        }

        if (active) {
          return (
            <Link key={href} href={href} style={ACTIVE_STYLE}>
              {icon(true)}
              <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--accent)' }}>{label}</span>
            </Link>
          )
        }

        return (
          <Link key={href} href={href}
            style={{ ...INACTIVE_STYLE, color: 'rgba(255,255,255,0.30)' }}
            className="transition-opacity active:opacity-70">
            {icon(false)}
            <span style={{ fontSize: 10, fontWeight: 500 }}>{label}</span>
          </Link>
        )
      })}
    </div>
  )
}
