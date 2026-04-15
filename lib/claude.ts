// Phase 2 — Claude API wrapper
// All calls go through server-side /app/api/ routes, never client-side.
// Always validate the user session before calling.
// Always catch errors and return a fallback character line.

export const CLAUDE_MODEL = 'claude-haiku-4-5'

// Cost guardrails (enforced in DB, not just here):
// - Dialogue: max 10 messages per user per day (free tier)
// - Vision scans: max 3 per user per day
// - Images must be compressed to 800×600px max before sending
