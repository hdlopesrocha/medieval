
import Card from './Card'

export interface Player {
  id: number
  name?: string
  // persisted `hand` may be an array of Card objects (legacy) or an array of UUID strings (new)
    hand?: number[]
    // per-player castle HP and max HP
    castleHp?: number
    castleMaxHp?: number
}

