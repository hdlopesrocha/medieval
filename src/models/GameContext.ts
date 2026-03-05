import { GameWorkflowState } from './GameWorkflowState'
import { Player } from './Player'

// Removed: use GameWorkflowState and GameHistoryEntry classes instead.


export class GameContext {
  deck: any[] = [];
  // persisted list of players (id/name) - hands are stored on each entry as `hand` when present
  // NOTE: `hand` contains an array of card UUID strings (persisted). Card objects are resolved by the GameEngine.
  playersList: Player[] =  [ {id: 0, name: 'Player 1', hand:[], castleHp: 20, castleMaxHp: 20}, {id: 1, name: 'Player 2', hand:[], castleHp: 20, castleMaxHp: 20} ];
  // persisted registry of card payloads (id -> serialized card) was moved to GameEngine
  playerId: number = 0;
  actionByPlayer: Record<string, string> = {};

  constructor(init?: Partial<GameContext>) {
    if (init) {
      // shallow assign basic fields
      this.deck = Array.isArray(init.deck) ? [...init.deck] : []
      this.playersList = Array.isArray(init.playersList) ? (init.playersList as Player[]).map((p: any, idx: number) => ({
        id: p?.id,
        name: p?.name,
        hand: p?.hand,
        castleHp: p?.castleHp,
        castleMaxHp: p?.castleMaxHp,
          cardsInPlay: Array.isArray(p?.cardsInPlay) ? p.cardsInPlay.map((entry: any) => {
            // Normalize legacy shapes into CardPosition { cardId, position }
            if (entry == null) return null
            if (typeof entry === 'number') return { cardId: Number(entry), position: 0 }
            if (typeof entry === 'string' && entry.trim() !== '') return { cardId: Number(entry), position: 0 }
            if (typeof entry === 'object') {
              const cardId = Number(entry.id ?? entry.cardId ?? entry.card ?? NaN)
              const position = Number(entry.position ?? entry.zone ?? 0)
              if (Number.isFinite(cardId)) return { cardId, position }
            }
            return null
          }).filter((it: any) => it && Number.isFinite(Number(it.cardId))) : []
      })) : this.playersList
      this.playerId = init.playerId ?? this.playerId
      this.actionByPlayer = { ...(init.actionByPlayer || {}) }
      // legacy `cardsById` moved to engine; ignore persisted field if present
    }
  }


  clearContext(workflow: GameWorkflowState) {
    this.deck = []
    this.playersList = []
    // cardsById is managed by GameEngine
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
  // Note: cards in play are stored per-player in `Player.cardsInPlay`.

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
