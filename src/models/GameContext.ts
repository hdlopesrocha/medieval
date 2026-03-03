import { GameWorkflowState } from './GameWorkflowState'
import { GameHistoryEntry } from './GameHistoryEntry'

// Removed: use GameWorkflowState and GameHistoryEntry classes instead.


export class GameContext {
  deck: any[] = [];
  players: Record<string, any[]> = {};
  started: boolean = false;
  playerId: number = 0;
  ownerRole: string = '';
  actionByPlayer: Record<string, string> = {};
  castleHpByPlayer: Record<string, number> = { '0': 20, '1': 20 };
  castleMaxHp: Record<string, number> = { '0': 20, '1': 20 };

  constructor(init?: Partial<GameContext>) {
    if (init) {
      if (init.deck) this.deck = [...init.deck];
      if (init.players) this.players = { ...init.players };
      if (init.started !== undefined) this.started = init.started;
      if (init.playerId !== undefined) this.playerId = init.playerId;
      if (init.ownerRole !== undefined) this.ownerRole = init.ownerRole;
      if (init.actionByPlayer !== undefined) this.actionByPlayer = { ...init.actionByPlayer };
      if (init.castleHpByPlayer !== undefined) this.castleHpByPlayer = { ...init.castleHpByPlayer };
      if (init.castleMaxHp !== undefined) this.castleMaxHp = { ...init.castleMaxHp };
    }
  }
  // ...existing methods...

  ensureDeck(cards?: any[], deckService?: any) {
    if (this.deck.length) return
    const source = (Array.isArray(cards) && cards.length) ? cards : deckService?.createDeck()
    this.deck = this.cloneCards(source)
  }

  setDeck(cards: any[]) {
    this.deck = this.cloneCards(cards)
  }

  getDeck(deckService?: any) {
    if (!this.deck.length && deckService) {
      this.ensureDeck(undefined, deckService)
    }
    return this.cloneCards(this.deck)
  }

  setPlayerCards(playerId: string | number, cards: any[]) {
    const playerKey = String(playerId)
    this.players = {
      ...this.players,
      [playerKey]: this.cloneCards(cards)
    }
  }

  getPlayerCards(playerId: string | number) {
    const playerKey = String(playerId)
    return this.cloneCards(this.players[playerKey] || [])
  }

  setAllPlayerCards(players: Record<string, any[]>) {
    const cloned: Record<string, any[]> = {}
    for (const playerKey of Object.keys(players || {})) {
      cloned[playerKey] = this.cloneCards(players[playerKey] || [])
    }
    this.players = cloned
  }


  clearContext(workflow: GameWorkflowState) {
    this.deck = []
    this.players = {}
    Object.assign(workflow, {
      started: false,
      playerId: 0,
      ownerRole: '',
      round: 0,
      actionByPlayer: {},
      castleHpByPlayer: { '0': 20, '1': 20 },
      castleMaxHp: { '0': 20, '1': 20 },
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
