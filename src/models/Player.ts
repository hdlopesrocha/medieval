
import Card from './Card'

export interface Player {
  id: number
  name?: string
  // persisted `hand` may be an array of Card objects (legacy) or an array of UUID strings (new)
  hand?: Card[] | string[]
}

