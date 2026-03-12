import CardPosition from './CardPosition'

/**
 * Represents an action that can be performed on a card in play.
 * Used to store action details before executing them through the game engine.
 */
export class Action {
  // The position of the card this action applies to
  cardPosition: CardPosition
  // The number of units to move (negative = left, positive = right)
  moveUnits: number

  constructor(cardPosition: CardPosition, moveUnits: number) {
    this.cardPosition = cardPosition
    this.moveUnits = moveUnits
  }
}

export default Action