'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  {
    href: '/dashboard',
    color: 'var(--char-accent)',
    label: 'Today',
    icon: (active: boolean, color: string) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="7" height="7" rx="1.5"
          fill={active ? color : 'none'} stroke={active ? color : '#8E8E93'} strokeWidth="1.8" />
        <rect x="14" y="3" width="7" height="7" rx="1.5"
          fill={active ? color : 'none'} stroke={active ? color : '#8E8E93'} strokeWidth="1.8" />
        <rect x="3" y="14" width="7" height="7" rx="1.5"
          fill={active ? color : 'none'} stroke={active ? color : '#8E8E93'} strokeWidth="1.8" />
        <rect x="14" y="14" width="7" height="7" rx="1.5"
          fill={active ? color : 'none'} stroke={active ? color : '#8E8E93'} strokeWidth="1.8" />
      </svg>
    ),
  },
  {
    href: '/log/habits',
    color: 'var(--char-accent)',
    label: 'Habits',
    icon: (active: boolean, color: string) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke={active ? color : '#8E8E93'} strokeWidth="1.8" />
        <path d="M8 12l3 3 5-5" stroke={active ? color : '#8E8E93'}
          strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: '/log/sleep',
    color: '#5AC8FA',
    label: 'Sleep',
    icon: (active: boolean, color: string) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
          stroke={active ? color : '#8E8E93'} strokeWidth="1.8"
          strokeLinecap="round" fill={active ? `${color}22` : 'none'} />
      </svg>
    ),
  },
  {
    href: '/summary',
    color: '#BF5AF2',
    label: 'Summary',
    icon: (active: boolean, color: string) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="4" width="18" height="17" rx="2"
          stroke={active ? color : '#8E8E93'} strokeWidth="1.8" />
        <path d="M3 9h18" stroke={active ? color : '#8E8E93'} strokeWidth="1.8" />
        <path d="M8 2v4M16 2v4" stroke={active ? color : '#8E8E93'}
          strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="8"  cy="14" r="1.2" fill={active ? color : '#8E8E93'} />
        <circle cx="12" cy="14" r="1.2" fill={active ? color : '#8E8E93'} />
        <circle cx="16" cy="14" r="1.2" fill={active ? color : '#8E8E93'} />
      </svg>
    ),
  },
  {
    href: '/scan',
    color: '#30D158',
    label: 'Scan',
    icon: (active: boolean, color: string) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M4 8V6a2 2 0 0 1 2-2h2" stroke={active ? color : '#8E8E93'}
          strokeWidth="1.8" strokeLinecap="round" />
        <path d="M20 8V6a2 2 0 0 0-2-2h-2" stroke={active ? color : '#8E8E93'}
          strokeWidth="1.8" strokeLinecap="round" />
        <path d="M4 16v2a2 2 0 0 0 2 2h2" stroke={active ? color : '#8E8E93'}
          strokeWidth="1.8" strokeLinecap="round" />
        <path d="M20 16v2a2 2 0 0 1-2 2h-2" stroke={active ? color : '#8E8E93'}
          strokeWidth="1.8" strokeLinecap="round" />
        <path d="M4 12h16" stroke={active ? color : '#8E8E93'}
          strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] px-4 pb-6 pt-2"
      style={{
        background: 'linear-gradient(to top, rgba(5,5,7,0.95) 60%, transparent)',
      }}>
      <nav
        className="flex justify-around items-center px-2 py-2 rounded-2xl"
        style={{
          background: 'rgba(255,255,255,0.06)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.09)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 8px 32px rgba(0,0,0,0.4)',
        }}>
        {tabs.map(({ href, label, icon, color }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link key={href} href={href}
              className="flex flex-col items-center gap-0.5 min-w-[52px] py-1 px-3 rounded-xl transition-all"
              style={active ? {
                background: `${color}18`,
                boxShadow: `0 0 12px ${color}22`,
              } : {}}>
              {icon(active, color)}
              <span className="text-[10px] font-medium"
                style={{ color: active ? color : '#5A5A68' }}>
                {label}
              </span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
