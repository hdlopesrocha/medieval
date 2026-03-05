import Card from '../models/Card'

export interface CardHandler {
  onMove(cardId: string, ownerId?: number, from?: number, to?: number, engine?: any): void
  onAttack(attackerId: string, targetId: string, engine?: any): void
  onPlayed(cardId: string, ownerId?: number, position?: number, engine?: any): void
  onKilled(cardId: string, ownerId?: number, engine?: any): void
}

export class DefaultCardHandler implements CardHandler {
  onMove(cardId: string, _ownerId?: number, _from?: number, to?: number, engine?: any): void {

  }

    onAttack(_attackerId: string, _targetId: string, _engine?: any): void {

    }

  onPlayed(cardId: string, ownerId?: number, position?: number, engine?: any): void {
    // TODO
    // the card should be added to cards in play for that player, and removed from the player's hand
    // the card's position should be set to 0
    // the card's owner should be set to the gameContext.playerID
    // the player removes another card from deck to hand, if any
    // the turn ends
  }

  onKilled(cardId: string, _ownerId?: number, engine?: any): void {

  }
}
