import { GameWorkflowState } from './GameWorkflowState'
import { Player } from './Player'

// Removed: use GameWorkflowState and GameHistoryEntry classes instead.


export class GameContext {
  deck: any[] = [];
  // persisted list of players (id/name) - hands are stored on each entry as `hand` when present
  // NOTE: `hand` contains an array of card UUID strings (persisted). Card objects are resolved by the GameEngine.
  playersList: Player[] =  [ {id: 0, name: 'Player 1', hand:[], castleHp: 20, castleMaxHp: 20}, {id: 1, name: 'Player 2', hand:[], castleHp: 20, castleMaxHp: 20} ];
  // persisted cards in play (serialized)
  cardsInPlay: any[] = [];
  // persisted registry of card payloads (id -> serialized card)
  cardsById: Record<string, any> = {};
  playerId: number = 0;
  actionByPlayer: Record<string, string> = {};

  constructor(init?: Partial<GameContext>) {
    Object.assign(this, init)
  }


  clearContext(workflow: GameWorkflowState) {
    this.deck = []
    this.playersList = []
    Object.assign(workflow, {
      started: false,
      playerId: 0,
      round: 0,
      actionByPlayer: {},
      gameOver: false,
      loserPlayerId: null,
      winnerPlayerId: null,
      history: []
    })
  }

  cloneCard(card: any) {
    if (!card) return null
    if (typeof card.toJSON === 'function') {
      return JSON.parse(JSON.stringify(card.toJSON()))
    }
    return JSON.parse(JSON.stringify(card))
  }

  cloneCards(cards: any[] = []) {
    if (!Array.isArray(cards)) return []
    return cards.map(card => this.cloneCard(card)).filter(Boolean)
  }

  // Legacy persistence removed. Use `gameStateService` for persistence.
}
