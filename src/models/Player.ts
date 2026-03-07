
import Card from './Card'
import CardPosition from './CardPosition'

export class Player {
  id: number
  name?: string
  hand?: Array<number> = []
  castleHp?: number
  castleMaxHp?: number
  played?: Array<CardPosition> = []

  constructor(init: Partial<Player>) {
    Object.assign(this, init)
  }
}

