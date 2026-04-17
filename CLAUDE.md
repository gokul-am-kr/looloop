# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Looloop by Doo Doodle is a phygital stationery brand. This repo is the companion app
for the Looloop 90-day habit and sleep tracker journal. The app is the core competitive
moat — no Indian journal brand has one.

Parent brand: Doo Doodle (doodoodle.in)
Product brand: Looloop by Doo Doodle
Tagline: "Close the loop."

---

## Tech stack

| Layer | Technology | Notes |
|---|---|---|
| Web frontend | Next.js (App Router) | Hosted on Vercel free tier |
| Mobile | React Native + Expo | iOS + Android from one codebase — Month 6 build |
| Database + auth | Supabase | Free tier, magic link auth |
| Payments | Razorpay | 1.9% per transaction, India-first |
| AI dialogue | Claude API — `claude-haiku-4-5-20251001` | Character responses, ₹0.02/message |
| AI vision | Claude API — `claude-haiku-4-5-20251001` | Habit grid scan, ₹0.10/scan |
| Push notifications | Expo Notifications | Free |
| Shareable cards | html2canvas or Satori | Sleep score cards, completion certs |
| AR (future) | AR.js → Snapchat Camera Kit | Post-core-app-launch |

---

## Build commands

```bash
# Install
npm install

# Dev server
npm run dev

# Type check
npx tsc --noEmit

# Lint
npm run lint

# Build
npm run build
```

Always run `npx tsc --noEmit` after a series of changes before considering a task done.

---

## Implementation status

**Done — Phase 1 + Phase 2 core:**
- Magic link auth: `app/auth/page.tsx` (send OTP) + `app/auth/callback/route.ts` (PKCE exchange)
- Auth middleware: `middleware.ts` protects `/dashboard`, `/log`, `/scan`, `/quiz`, `/summary`, `/certificate`, `/upgrade` — redirects unauthenticated users to `/auth` and authenticated users away from `/auth`
- Dashboard: `app/dashboard/page.tsx` — server component with activity rings, week strip, habit/sleep cards, character chat, premium check
- Edition quiz: `app/quiz/page.tsx` — 7 questions → tally → character result → upserts `users.edition`
- Habit log: `app/log/habits/page.tsx` — setup mode + daily log + 7-day history strip; `app/log/page.tsx` redirects to `/log/habits`
- Sleep log: `app/log/sleep/page.tsx`
- Mood log: `app/log/mood/page.tsx`
- Journal scan: `app/scan/page.tsx` — client-side image compression (≤800×600 canvas) then POST to `/api/scan`
- QR activation UI: `app/activate/page.tsx`
- Weekly summary: `app/summary/page.tsx`, `app/summary/week/page.tsx`
- Upgrade page: `app/upgrade/page.tsx`
- Completion certificate: `app/certificate/page.tsx`
- API — character chat: `app/api/chat/route.ts` — session check, daily limit (10/day), streak fetch, Claude call, usage log
- API — journal scan: `app/api/scan/route.ts` — session check, daily limit (3/day), Claude Vision, usage log
- API — QR activation: `app/api/activate/route.ts` — validates `qr_codes` table, single-use, writes `premium_access`
- API — Razorpay webhook: `app/api/webhook/route.ts` — HMAC signature verification, writes `premium_access`
- Shared types: `types/index.ts` — all DB row types
- Supabase clients: `lib/supabase.ts` (browser) + `lib/supabase-server.ts` (server)
- Character config: `lib/characters.ts` — all four characters with `systemPrompt(streak)` factory
- Streak logic: `lib/streak.ts` — `computeStreak(dates[])` — streak dies if last log older than yesterday
- Sleep score: `lib/sleep-score.ts` — `computeSleepScore(logs, windowDays)` → `SleepScore` (duration 40pt + quality 40pt + consistency 20pt)
- `lib/utils.ts` — `formatINR()` utility
- `lib/claude.ts` — `CLAUDE_MODEL` constant
- UI components: `components/ui/` — activity-rings, bottom-nav, character-chat, character-theme, completion-certificate, progress-ring, radial-habit-chart, radial-mood-chart, radial-sleep-chart, sleep-garden, sleep-score-card, time-picker

**Pending:**
- Push notifications (Phase 2)
- Sleep Garden visualisation (Phase 3)
- Mobile app, Razorpay subscription UI (Phase 4)

---

## Supabase client pattern

`lib/supabase.ts` exports two functions — use the right one for the context:

- **`createBrowserClient()`** from `@/lib/supabase` — for `'use client'` components. No `next/headers` dependency.
- **`createServerClient()`** from `@/lib/supabase-server` — async, for Server Components and API Route Handlers (`route.ts`). Imports `next/headers`; never import from client components.

The two are split into separate files (`lib/supabase.ts` and `lib/supabase-server.ts`) specifically to prevent the `next/headers` import from being bundled into client code.

---

## Code style

- TypeScript everywhere — no plain JS files
- ES modules (import/export), not CommonJS (require)
- Destructure imports: `import { createClient } from '@supabase/supabase-js'`
- Use `async/await`, never `.then()` chains
- Prefer named exports over default exports for components
- File naming: `kebab-case.tsx` for pages/components, `camelCase.ts` for utilities
- No `any` types — use proper types or `unknown`
- Tailwind for all styling — no inline styles, no CSS modules

---

## Character system

Each journal edition has a character. Always use the correct character per edition context.

| Edition | Character | Personality | Voice style |
|---|---|---|---|
| 01 (current) | Mochi the Cat | Warm, curious, quietly encouraging | Short, gentle, one-line nudges |
| 01 (alt) | Pico the Cactus | Dry, calm, never admits he cares | Terse, deadpan, always shows up |
| 02 (Month 6) | Jelli the Jellyfish | Dreamy, poetic, gentle | Soft, never judges |
| Study | Inko the Octopus | Chatty, curious, science facts | Enthusiastic, slightly nerdy |

All character config (system prompts, personality, domain) lives in `lib/characters.ts` as `characters: Record<Edition, Character>`. Each character's `systemPrompt` is a function that takes the user's current streak count and returns the full system prompt string.

**Character dialogue rules:**
- Never let a character say anything preachy or lecture-y
- Mochi/Pico speak to habits. Jelli speaks to sleep. Inko speaks to study streaks.
- Trigger: user's current streak count → character responds to that number

---

## Supabase schema

Core tables — always match these exactly, never rename columns without updating this file.

```
users           — id, email, created_at, edition (enum: mochi|pico|jelli|inko), habit_names (text[])
habit_logs      — id, user_id, date, habits (jsonb: {habit_name: boolean}), created_at
sleep_logs      — id, user_id, date, bedtime, wake_time, quality (1-5), notes, created_at
streaks         — id, user_id, current_streak, longest_streak, last_logged_date
journal_scans   — id, user_id, scan_url, tick_count, scanned_at
premium_access  — id, user_id, source (enum: qr|razorpay), expires_at, journal_edition
api_usage       — id, user_id, feature, model, created_at
qr_codes        — id, code, edition, used (boolean), used_by (user_id)
```

**Auth:** Magic link is the current v1 implementation. Google and Apple OAuth are planned as primary sign-in methods for the mobile app (Apple Sign In is required by App Store rules if any other social login is offered — both must ship together for iOS).

**Row Level Security:** Always enable RLS. Users can only read/write their own rows.
Every query must go through the Supabase client with the user's session, never service role key on the frontend.

---

## Claude API usage

**Always use `claude-haiku-4-5-20251001` for all AI features** — not Sonnet, not Opus. The constant `CLAUDE_MODEL` in `lib/claude.ts` is the canonical reference. Note: the constant currently holds `'claude-haiku-4-5'` (without date suffix) — use the full versioned ID `claude-haiku-4-5-20251001` when updating.

**Image compression before Vision scan:**
- Compress to max 800×600px before sending to Claude Vision
- Compression is done **client-side** in `app/scan/page.tsx` using canvas/`createImageBitmap` before the file is POSTed to `/api/scan` — not in the API route itself
- Never send raw phone photos — too large, too expensive

**API route pattern:**
- Always in `/app/api/` — never call Claude API from client-side
- Always validate the user session before calling Claude
- Always catch errors and return a fallback character line

**Cost guardrails:**
- Vision scans: max 3 per user per day (enforce in DB, not just frontend)
- Dialogue: max 10 messages per user per day on free tier
- Log every Claude API call to the `api_usage` table for cost tracking

---

## Business logic rules

**Free vs premium:**
- Free tier: edition quiz, habit log, sleep log, 1 journal scan/week, basic character dialogue
- Premium (₹99/month): unlimited scans, advanced sleep insights, full character dialogue, completion cert, sleep score cards
- Journal buyers: 3 months premium via QR code inside the journal — verify via `premium_access` table

**QR code flow:**
- Each journal has a unique QR code linking to `doodoodle.in/app/activate?code=XXXXX`
- Code activates 90 days of premium for the user who scans it
- Codes are single-use and tied to an edition

**Pricing:**
- Journal: ₹349 (₹449 after app launch at Month 6)
- Premium: ₹99/month
- Currency: always INR (₹), never USD in the UI — use `formatINR()` from `lib/utils.ts`

---

## Feature build order

Follow this order strictly. Do not build Phase 2 features before Phase 1 is complete and tested.

**Phase 1 — Web app foundation (Month 2)**
1. Next.js + Supabase setup, auth (magic link), user profile ✓ (auth done; profile/edition setup pending)
2. Edition quiz (7 questions → character recommendation → purchase link)
3. Daily habit log (5 habits, blank — user names them)
4. Daily sleep log (bedtime, wake time, quality rating)

**Phase 2 — AI features (Month 3–4)**
5. Character dialogue via Claude API (streak-triggered)
6. Journal scan via Claude Vision (habit grid photo → tick count)
7. Push notifications via Expo (9pm daily, character-voiced)

**Phase 3 — Virality features (Month 4–5)**
8. Weekly sleep score card (0–100, shareable image via html2canvas)
9. 90-day completion certificate (LinkedIn-shareable)
10. Sleep Garden visualisation (mirrors physical journal tracker)

**Phase 4 — Mobile + Edition 02 (Month 6)**
11. React Native / Expo mobile app (convert from web)
12. App Store + Play Store submission
13. Razorpay premium subscription integration
14. Jelli Edition 02 content + character voice

---

## Environment variables

```bash
# Never hardcode these. Always use process.env.*
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=   # Server-only. Never expose to client.
ANTHROPIC_API_KEY=           # Server-only. Never expose to client.
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=         # Server-only.
NEXT_PUBLIC_APP_URL=         # e.g. https://app.doodoodle.in
```

---

## Design system

The app uses a unified premium dark glassmorphism theme. Every new screen must follow these rules.

### Background
- Base: `#07051a` (deep dark purple — set per-page, not globally)
- Three ambient orbs positioned absolutely behind all content (z-index 0):
  - Orb 1: `#7F77DD` opacity 0.65, 300×300px, blur(90px), top-left
  - Orb 2: `#534AB7` opacity 0.50, 240×240px, blur(75px), mid-right
  - Orb 3: `#AFA9EC` opacity 0.30, 240×240px, blur(100px), bottom-left
- Content sits at `position: relative; z-index: 1` above orbs
- Outer page container uses `overflow: clip` (not `hidden`) to contain orbs without creating a scroll context

### Deep glass card style
Used for all stat cards, habit list cards, and surface panels:
```tsx
{
  background: 'linear-gradient(145deg, rgba(255,255,255,0.13) 0%, rgba(255,255,255,0.04) 60%, rgba(255,255,255,0.02) 100%)',
  borderTop: '0.5px solid rgba(255,255,255,0.28)',
  borderLeft: '0.5px solid rgba(255,255,255,0.18)',
  borderRight: '0.5px solid rgba(255,255,255,0.04)',
  borderBottom: '0.5px solid rgba(255,255,255,0.04)',
  boxShadow: '0 16px 48px rgba(0,0,0,0.65), 0 4px 12px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.15)',
  backdropFilter: 'blur(28px)',
  WebkitBackdropFilter: 'blur(28px)',
  borderRadius: 20,
}
```
The asymmetric border (bright top-left, near-invisible bottom-right) creates the glass depth effect.

### Glass surface classes (defined in `app/globals.css`)
| Class | Use for | Key properties |
|---|---|---|
| `.glass` | Cards, panels, option rows | `rgba(18,18,22,0.52)` · blur(24px) · border rgba(255,255,255,0.08) |
| `.glass-elevated` | Inputs, message bubbles, secondary surfaces | `rgba(36,36,44,0.62)` · blur(16px) |
| `.glass-strong` | Bottom sheets, overlays | `rgba(5,5,7,0.78)` · blur(48px) |

### Text hierarchy
| Token | Value | Use |
|---|---|---|
| White | `#ffffff` | Headlines, primary values |
| `.text-muted` | `#7A7A86` | Labels, subtitles, secondary info |
| `.text-dim` | `#4E4E5A` | Disabled states, placeholder hints |
| Stat label | `rgba(175,169,236,0.90)` | Uppercase stat labels inside cards |
| Stat sub | `rgba(175,169,236,0.45)` | Sub-labels inside cards |

**Never use** `#636366`, `#52525A`, `#3A3A44` — these are invisible on the dark background.

### Interactive elements

**Tab pills (Habits/Sleep/Mood and equivalent toggles):**
- Container: `rgba(255,255,255,0.05)` background, no border
- Active tab: `linear-gradient(135deg, rgba(255,255,255,0.16), rgba(255,255,255,0.06))` with asymmetric borders (`borderTop: 0.5px solid rgba(255,255,255,0.32)`, sides/bottom fading to 0.05), `boxShadow: 0 4px 20px rgba(0,0,0,0.50), inset 0 1px 0 rgba(255,255,255,0.15)`, `color: #ffffff`
- Inactive tab: transparent background, `border: 0.5px solid rgba(255,255,255,0.08)`, `color: rgba(255,255,255,0.28)`

**Bottom nav (`components/ui/bottom-nav.tsx`):**
- Floating frosted tray: `position: fixed; bottom: 0; left: 0; right: 0` with outer wrapper `padding: 0 16px 16px`
- Inner pill: `border-radius: 24px` (all corners), `padding: 10px 20px 24px`, `background: linear-gradient(135deg, rgba(255,255,255,0.10), rgba(255,255,255,0.04))`, `border: 0.5px solid rgba(255,255,255,0.14)`, `boxShadow: 0 -4px 24px rgba(0,0,0,0.40), 0 8px 32px rgba(0,0,0,0.50), inset 0 1px 0 rgba(255,255,255,0.15)`, `backdropFilter: blur(28px)`
- Active item: glass pill `border-radius: 16px`, `padding: 8px 20px`, same asymmetric glass border/gradient as tab pills, `color: #ffffff`, `opacity: 1`
- Inactive items: `color: rgba(255,255,255,0.55)`, `opacity: 0.45`
- No per-tab accent colors — everything is white-on-glass

**Stat cards:**
- Use deep glass card style above
- Label: `rgba(175,169,236,0.90)` uppercase 10px tracking-wide
- Value: `#ffffff` 26px font-medium, `textShadow: 0 2px 12px rgba(175,169,236,0.30)`

**Buttons (primary):** `var(--char-accent)` fill, black text, accent glow shadow
**Buttons (secondary):** `.glass-elevated` with muted text

### Accent glow pattern
When showing active/highlighted values, always pair the color with a matching glow:
```tsx
// Number value
style={{ color: accent, textShadow: `0 0 18px ${accent}66` }}

// Dot indicator
style={{ background: accent, boxShadow: `0 0 6px ${accent}` }}

// Card glow
boxShadow: `... 0 0 20px ${color}18`
```

### RadialHabitChart (`components/ui/radial-habit-chart.tsx`)
- **Geometry**: near-full circle, 0.18 rad gap at top. `FAN_START = 90 + GAP_DEG/2 ≈ 95.16°`, `FAN_SPAN ≈ 349.69°`
- **Ring constants**: `RING_H = 13`, `RING_GAP = 1`, `R_START = 40`, `DAY_INSET = 0.004 * (180/π)` (0.008 rad total gap per segment boundary)
- **Done colors** (innermost → outermost): `#ffffff`, `#ebe9ff`, `#d2cefa`, `#b9b4f2`, `#918ae1`
- **Missed**: `rgba(60,52,140,0.25)` · **Future**: `rgba(255,255,255,0.04)`
- **Segment borders**: `stroke="rgba(0,0,0,0.35)" strokeWidth="0.4"` on all tile paths
- **Circular glass plate**: sits behind the SVG as an absolutely-positioned div, `border-radius: 50%`, covers the ring area only (`platePct = 2 * ringEdge / vbSize * 100`). Day number labels float outside the plate but inside the SVG canvas.
- **Canvas width**: rendered at 92% of screen width (set on container in `app/summary/page.tsx`)
- **Day labels**: outside outermost ring at `ringEdge + NUM_INSET (12)`, `fontSize="11"`, `rgba(255,255,255,0.30)`, today's date in `#ffffff`
- **Center**: current date (day + month abbreviation) + today dot at `(CX, CY+19)`
- **Habit list dot colors** match ring colors by completion rank: white → `#ebe9ff` → `#d2cefa` → `#b9b4f2` → `#918ae1`

---

## Do not

- Do not call the Claude API or Razorpay from client-side code — always route through `/app/api/`
- Do not use the Supabase service role key on the frontend
- Do not build the mobile app before the web app Phase 1 is complete
- Do not add new character editions without updating `/lib/characters.ts` and this file
- Do not change Supabase column names without updating the schema section above
- Do not add ₹ pricing anywhere without using the `formatINR()` utility in `/lib/utils.ts`
- Do not skip TypeScript types — no `any`
- Do not use hardcoded dark colors (`#636366`, `#52525A`, `#3A3A44`) — use `text-muted` class or `#7A7A86`
- Do not build new pages without the glass surface classes and dark background — every screen must match the glassmorphism theme
- Do not use opaque solid backgrounds on cards — always use translucent glass with backdrop-filter

---

## Key decisions already made

- App is free for all users; premium unlocked via journal QR or Razorpay
- Haiku model for all Claude API calls — never upgrade without checking cost impact
- Undated journal = no fixed calendar in the app, just day counts (Day 1–90)
- Up to 10 habits per user (`MAX_HABITS = 10` in `app/log/habits/page.tsx`), fully blank — user names them, no presets; default count shown on first setup is 5
- Sleep Garden is a visual stacked circle tracker (terracotta pot) — see journal v7 for reference
- Mood tracker is a radial sunburst with Mochi at centre, 30 segments
- Edition 02 (Jelli) launches Month 6 alongside mobile app and price increase to ₹449
