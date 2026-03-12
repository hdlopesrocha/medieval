export interface CardPosition {
  // Numeric id of the card (matches Card.id)
  cardId: number
  // Zone/slot index where the card is placed
  position: number
  // ID of the player who owns this card in play
  ownerId: number
}

export default CardPosition
