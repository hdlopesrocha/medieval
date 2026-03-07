import { GameWorkflowState } from './GameWorkflowState'
import { Player } from './Player'

// Removed: use GameWorkflowState and GameHistoryEntry classes instead.


export class GameContext {
  deck: Array<number> = [];
  playersList: Array<Player> =  [];
  playerId: number = 0;
  actionByPlayer: Record<string, string> = {};
  static load: any;

  constructor(init?: Partial<GameContext>) {
    if (init) {
    
      this.deck = init.deck
      this.playersList = init.playersList 
      this.playerId = init.playerId
      this.actionByPlayer = init.actionByPlayer
    }
  }

  getEnemyId() {
    return this.playersList.find(player => player.id !== this.playerId)?.id ?? 0
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

  // Expose a combined view of all players' cards in play (read-only array of same object refs)
  // Note: cards in play are stored per-player in `Player.played`.

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

// Local storage helpers moved here so consumers can load/save a context directly.
const GAME_STORAGE_KEY = 'tocabola:game'
function hasLocalStorage() {
  try {
    return typeof window !== 'undefined' && !!window.localStorage
  } catch (e) {
    return false
  }
}

export namespace GameContextStorage {
  export function load(): GameContext | null {
    if (!hasLocalStorage()) return null
    try {
      const raw = window.localStorage.getItem(GAME_STORAGE_KEY)
      if (!raw) return null
      const parsed = JSON.parse(raw)
      console.log('GameContext.load from storage', parsed)
      return new GameContext(parsed)
    } catch (e) {
      console.warn('GameContext.load failed', e)
      return null
    }
  }

  export function save(context: Partial<GameContext>) {
    if (!hasLocalStorage()) return false
    try {
      window.localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(context))
      return true
    } catch (e) {
      console.warn('GameContext.save failed', e)
      return false
    }
  }

}
