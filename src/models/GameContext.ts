import { GameWorkflowState } from './GameWorkflowState'
import { GameHistoryEntry } from './GameHistoryEntry'

// Removed: use GameWorkflowState and GameHistoryEntry classes instead.


export class GameContext {
  deck: any[] = [];
  // `players` stores per-player hands (keyed by player id)
  players: Record<string, any[]> = {};
  // persisted list of players (id/name)
  playersList: Array<{ id: number; name?: string }> = [];
  // persisted cards in play (serialized)
  cardsInPlay: any[] = [];
  playerId: number = 0;
  ownerRole: string = '';
  actionByPlayer: Record<string, string> = {};
  castleHpByPlayer: Record<string, number> = { '0': 20, '1': 20 };
  castleMaxHp: Record<string, number> = { '0': 20, '1': 20 };

  constructor(init?: Partial<GameContext>) {
    if (init) {
      if (init.deck) this.deck = [...init.deck];
      if (init.players) this.players = { ...init.players };
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

  setPlayersList(players: Array<{ id: number; name?: string }>) {
    this.playersList = Array.isArray(players) ? players.map(p => ({ id: Number(p.id || 0), name: typeof p.name === 'string' ? p.name : undefined })) : []
  }

  getPlayersList() {
    return (this.playersList || []).map(p => ({ id: Number(p.id || 0), name: p.name }))
  }

  setCardsInPlay(cards: any[]) {
    // cards is an array of objects { id, ownerId, position, hidden, card }
    this.cardsInPlay = Array.isArray(cards) ? cards.map(c => ({ id: c.id, ownerId: c.ownerId, position: c.position, hidden: !!c.hidden, card: this.cloneCard(c.card) })) : []
  }

  getCardsInPlay() {
    return (this.cardsInPlay || []).map(c => ({ id: c.id, ownerId: Number(c.ownerId), position: Number(c.position), hidden: !!c.hidden, card: c.card }))
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
