
import Card from './Card'

export class Player {
  id: number
  name?: string
  hand?: Array<number> = []
  castleHp?: number
  castleMaxHp?: number

  constructor(init: Partial<Player>) {
    Object.assign(this, init)
  }
}

