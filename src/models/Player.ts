
import Card from './Card'
import CardPosition from './CardPosition'

export interface Player {
  id: number
  name?: string
  // persisted `hand` may be an array of Card objects (legacy) or an array of UUID strings (new)
    hand?: string[]
    // per-player castle HP and max HP
    castleHp?: number
    castleMaxHp?: number
  // cards in play owned by this player (persisted form): array of { cardId, position }
  cardsInPlay?: CardPosition[]
}

