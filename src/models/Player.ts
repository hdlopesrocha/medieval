
import Card from './Card'
import CardPosition from './CardPosition'

export interface Player {
  id: number
  name?: string
  hand?: Array<number>
  castleHp?: number
  castleMaxHp?: number
  cardsInPlay?: Array<CardPosition>
}

