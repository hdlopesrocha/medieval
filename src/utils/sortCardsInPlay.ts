export interface SortableInPlayCard {
  id?: string | number
  ownerId?: number | string
  position?: number | string
}

export function sortCardsInPlayBySlot<T extends SortableInPlayCard>(cardsInPlay: T[], activePlayerId: number) {
  const activeId = Number(activePlayerId || 0)
  const cards = Array.isArray(cardsInPlay) ? [...cardsInPlay] : []
  cards.sort((left, right) => {
    const leftEnemy = Number(left.ownerId) !== activeId
    const rightEnemy = Number(right.ownerId) !== activeId
    if (leftEnemy !== rightEnemy) return leftEnemy ? 1 : -1

    const leftPos = Number(left.position || 0)
    const rightPos = Number(right.position || 0)
    if (!leftEnemy) {
      if (leftPos !== rightPos) return leftPos - rightPos
    } else {
      if (leftPos !== rightPos) return rightPos - leftPos
    }

    return String(left.id || '').localeCompare(String(right.id || ''))
  })
  return cards
}

export default sortCardsInPlayBySlot