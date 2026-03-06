import Card from '../models/Card'
import GameEngine from './GameEngine'

export interface CardHandler {
  onMove(cardId: string, ownerId?: number, from?: number, to?: number, engine?: GameEngine): void
  onAttack(attackerId: string, targetId: string, engine?: GameEngine): void
  onPlayed(cardId: number, ownerId?: number, engine?: GameEngine): void
  onKilled(cardId: number, ownerId?: number, engine?: GameEngine): void
}

export class DefaultCardHandler implements CardHandler {
  onMove(cardId: string, _ownerId?: number, _from?: number, to?: number, engine?: GameEngine): void {

  }

    onAttack(_attackerId: string, _targetId: string, _engine?: GameEngine): void {

    }

  onPlayed(cardId: number, ownerId?: number, engine?: GameEngine): void {
    console.log("onPlayed", cardId, ownerId);
  }

  onKilled(cardId: number, _ownerId?: number, engine?: GameEngine): void {

  }
}
