import type { CardJSON } from './Card'

export type PlayerView = {
  id: number
  name?: string
}

export type InPlayCardView = {
  id: string
  ownerId: number
  position: number
  hidden?: boolean
  card?: Partial<CardJSON> & Record<string, unknown>
}

export type GameStateView = {
  activePlayerId: number
  currentUser: number
  round: number
  players: PlayerView[]
  cardsInPlay: InPlayCardView[]
  playedThisRound: Record<string, unknown>
  castleHpByPlayer: Record<number, number>
  gameOver: boolean
  loserPlayerId: number | null
  winnerPlayerId: number | null
}

export function createEmptyGameStateView(): GameStateView {
  return {
    activePlayerId: 0,
    currentUser: 0,
    round: 1,
    players: [],
    cardsInPlay: [],
    playedThisRound: {},
    castleHpByPlayer: {},
    gameOver: false,
    loserPlayerId: null,
    winnerPlayerId: null
  }
}
