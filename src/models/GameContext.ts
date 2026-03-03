import { GameWorkflowState } from './GameWorkflowState'
import { GameHistoryEntry } from './GameHistoryEntry'
import { Player } from './Player'

// Removed: use GameWorkflowState and GameHistoryEntry classes instead.


export class GameContext {
  deck: any[] = [];
  // persisted list of players (id/name) - hands are stored on each entry as `hand` when present
  playersList: Player[] = [];
  // persisted cards in play (serialized)
  cardsInPlay: any[] = [];
  playerId: number = 0;
  ownerRole: string = '';
  actionByPlayer: Record<string, string> = {};
  castleHpByPlayer: Record<string, number> = { '0': 20, '1': 20 };
  castleMaxHp: Record<string, number> = { '0': 20, '1': 20 };

  constructor(init?: Partial<GameContext>) {
    if (init) {
      this.deck = [...init.deck];
      this.playersList = init.playersList;
      this.playerId = init.playerId;
      this.ownerRole = init.ownerRole;
      this.actionByPlayer = { ...init.actionByPlayer };
      this.castleHpByPlayer = { ...init.castleHpByPlayer };
      this.castleMaxHp = { ...init.castleMaxHp };
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
    const id = Number(playerId)
    const idx = (this.playersList || []).findIndex(p => Number(p.id) === id)
    const hand = this.cloneCards(cards)
    if (idx === -1) {
      this.playersList = [...(this.playersList || []), { id, hand }]
    } else {
      const copy = [...this.playersList]
      copy[idx] = { ...copy[idx], hand }
      this.playersList = copy
    }
  }

  getPlayerCards(playerId: string | number) {
    const id = Number(playerId)
    const entry = (this.playersList || []).find(p => Number(p.id) === id)
    return this.cloneCards((entry && Array.isArray(entry.hand)) ? entry.hand : [])
  }

  setAllPlayerCards(players: Record<string, any[]>) {
    // Merge provided hands into playersList entries (create entries when missing)
    const copy = Array.isArray(this.playersList) ? [...this.playersList] : []
    for (const playerKey of Object.keys(players || {})) {
      const id = Number(playerKey)
      const hand = this.cloneCards(players[playerKey] || [])
      const idx = copy.findIndex(p => Number(p.id) === id)
      if (idx === -1) {
        copy.push({ id, hand })
      } else {
        copy[idx] = { ...copy[idx], hand }
      }
    }
    this.playersList = copy
  }

  setPlayersList(players: Player[]) {
    this.playersList = Array.isArray(players) ? players.map((p: any) => ({ id: Number(p.id || 0), name: typeof p.name === 'string' ? p.name : undefined, hand: Array.isArray(p.hand) ? this.cloneCards(p.hand) : undefined })) : []
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
    this.playersList = []
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
