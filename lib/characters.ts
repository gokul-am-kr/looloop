import { Edition } from '@/types'

export type CharacterDomain = 'habits' | 'sleep' | 'study'

export interface CharacterPalette {
  accent:   string  // solid hex, e.g. '#FF6B35'
  accent10: string  // rgba at 10% — done row background
  accent22: string  // rgba at 22% — done row border
  orb1:     string  // full rgba() — body gradient top-left
  orb2:     string  // full rgba() — body gradient bottom-right
  orb3:     string  // full rgba() — body gradient center
}

export interface Character {
  name: string
  edition: Edition
  domain: CharacterDomain
  personality: string
  palette: CharacterPalette
  systemPrompt: (streak: number) => string
}

export const palettes: Record<Edition, CharacterPalette> = {
  mochi: {
    accent:   '#FF6B35',
    accent10: 'rgba(255,107,53,0.10)',
    accent22: 'rgba(255,107,53,0.22)',
    orb1:     'rgba(255,107,53,0.13)',
    orb2:     'rgba(90,200,250,0.11)',
    orb3:     'rgba(191,90,242,0.06)',
  },
  pico: {
    accent:   '#30D158',
    accent10: 'rgba(48,209,88,0.10)',
    accent22: 'rgba(48,209,88,0.22)',
    orb1:     'rgba(48,209,88,0.13)',
    orb2:     'rgba(48,209,88,0.07)',
    orb3:     'rgba(90,200,250,0.06)',
  },
  jelli: {
    accent:   '#5AC8FA',
    accent10: 'rgba(90,200,250,0.10)',
    accent22: 'rgba(90,200,250,0.22)',
    orb1:     'rgba(90,200,250,0.13)',
    orb2:     'rgba(175,82,222,0.10)',
    orb3:     'rgba(90,200,250,0.06)',
  },
  inko: {
    accent:   '#BF5AF2',
    accent10: 'rgba(191,90,242,0.10)',
    accent22: 'rgba(191,90,242,0.22)',
    orb1:     'rgba(191,90,242,0.13)',
    orb2:     'rgba(88,86,214,0.12)',
    orb3:     'rgba(255,55,95,0.05)',
  },
}

export const characters: Record<Edition, Character> = {
  mochi: {
    name: 'Mochi the Cat',
    edition: 'mochi',
    domain: 'habits',
    personality: 'Warm, curious, quietly encouraging. Short, gentle nudges.',
    palette: palettes.mochi,
    systemPrompt: (streak) =>
      `You are Mochi the Cat. Warm, curious, quietly proud of the user. One line max. Reference their streak of ${streak} days naturally. Never break character. Never be preachy.`,
  },
  pico: {
    name: 'Pico the Cactus',
    edition: 'pico',
    domain: 'habits',
    personality: 'Dry, deadpan, never admits he cares — but always shows up.',
    palette: palettes.pico,
    systemPrompt: (streak) =>
      `You are Pico the Cactus. Dry, calm, never admits you care — but you always show up. One line. Deadpan. The user has a streak of ${streak} days. Never break character. Never be preachy.`,
  },
  jelli: {
    name: 'Jelli the Jellyfish',
    edition: 'jelli',
    domain: 'sleep',
    personality: 'Dreamy, poetic, never judges.',
    palette: palettes.jelli,
    systemPrompt: (streak) =>
      `You are Jelli the Jellyfish. Dreamy, poetic, soft, never judgmental. One line max. The user has tracked sleep for ${streak} days. Never break character. Never be preachy.`,
  },
  inko: {
    name: 'Inko the Octopus',
    edition: 'inko',
    domain: 'study',
    personality: 'Enthusiastic, chatty, science facts.',
    palette: palettes.inko,
    systemPrompt: (streak) =>
      `You are Inko the Octopus. Chatty, curious, loves science facts. One line max. The user has a study streak of ${streak} days. Never break character. Never be preachy.`,
  },
}
