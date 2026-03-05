import Card from '../models/Card'
import { DefaultCardHandler } from './CardHandler'
import { Player } from '../models/Player'
import { getCommandFor } from './commands/registry'
// import GameContext from '../models/GameContext' if needed
import deckService from '../services/deckService'
import gameStateService from '../services/gameStateService'
import { GameWorkflowState } from '../models/GameWorkflowState'
import { GameContext } from '../models/GameContext'



export const ZONES = [
  'PlayerCastle',
  'PlayerVillage',
  'PlayerFarm',
  'PlayerOpenFields',
  'EnemyOpenFields',
  'EnemyFarm',
  'EnemyVillage',
  'EnemyCastle'
]

export const ZONE_ELEMENTS: Array<'earth' | 'water'> = [
  'earth',
  'earth',
  'earth',
  'water',
  'water',
  'earth',
  'earth',
  'earth'
]

export type GameCard = {
  id: string
  card: Card
  ownerId: number
  position: number // index into ZONES
  hidden?: boolean
}

export default class GameEngine {
  ZONES = ZONES
  // Persistence: deck, players, cardsInPlay and hands are persisted in `gameContext`.
  gameContext: GameContext = new GameContext()
  gameWorkflow: GameWorkflowState = new GameWorkflowState()
  private _skipEnemyAttacks = false
  // runtime registries expected by UI and engine callers
  public cardsById: Record<string, Card> = {}

  // Expose the persisted deck via a simple proxy (array of card ids)
  get deck(): any[] {
    return this.gameContext?.deck || []
  }
  set deck(v: any[]) {
    this.gameContext.deck = Array.isArray(v) ? v : []
  }

  // Expose players list (persisted entries) as a convenience
  get players(): Player[] {
    return this.gameContext?.playersList || []
  }

  // Return card instances for a player's hand (resolves persisted ids)
  getPlayerCards(playerId: number) : Card[] {
    const cards = this.gameContext.playersList[playerId].hand.map((id: any) => {
      return this.cardsById[id]
    })
    return cards
  }

  // Helper: normalize a card reference to its id string
  getCardId(card: any) {
    if (card == null) return ''
    if (typeof card === 'string' || typeof card === 'number') return String(card)
    if ((card as any).id != null) return String((card as any).id)
    return ''
  }

  // Normalize played/action flags into boolean map
  normalizePlayedThisRound(map: Record<string, any> = {}) {
    const out: Record<string, boolean> = {}
    for (const k of Object.keys(map || {})) {
      out[k] = Boolean(map[k])
    }
    return out
  }


  // Import a normalized snapshot into engine (used by UI/services)
  importState(snapshot: any): { ok: boolean; reason?: string } {
     return { ok: true }
  }
  

  syncGameStateService() {

    // Use workflow object as needed, e.g. this.gameContext.setWorkflow(workflow)
  }

  constructor() {
    this.reset();
    }

  reset() {
    // Initialize game context and cards registry, register all cards and deal hands.
    const initialDeck: Card[] = deckService.createDeck()
    const deck: number[] = []
    // register cards and collect ids
    this.cardsById = {}
    for (const c of initialDeck) {
      this.cardsById[c.id] = c 
      deck.push(c.id)
    }

    // If there is saved state, prefer loading that; otherwise create fresh context
    if (!this.loadState()) {
      // create new workflow and context
      this.gameWorkflow = new GameWorkflowState()
      this.gameContext = new GameContext()

      // Shuffle the registered ids and assign as deck
      const deckArr: number[] = deck.slice()
      for (let i = deckArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        const tmp = deckArr[i]
        deckArr[i] = deckArr[j]
        deckArr[j] = tmp
      }

      // Deal 5 cards to each player (persist as UUID arrays in gameContext)
      const handSize = 5
      const players = this.gameContext.playersList
      for (const p of players) {
        const handIds: number[] = []
        for (let k = 0; k < handSize && deckArr.length; k++) {
          const cid = deckArr.shift() as number
          if (cid) handIds.push(cid)
        }
        // persist as string ids to be compatible with persisted shape
        try { p.hand = handIds.map(h => String(h)) } catch (_) { p.hand = [] }

      }
      this.gameContext.deck = deckArr
      this.cardsById = {}
      for(const c of initialDeck) {
        this.cardsById[c.id] = c
      }

      // save initial state
      this.saveState()
    }

    this.syncGameStateService()

  }

  // revive top of deck into owner's castle
  reviveTopToCastle(owner: number) {
    try {
      const topId = this.deck && this.deck.length ? this.deck.shift() : null
      if (!topId) return { ok: false, reason: 'deck empty' }
      // place on owner's cardsInPlay at castle zone
      const ownerEntry = (this.gameContext.playersList || []).find(p => Number(p.id) === Number(owner))
      if (!ownerEntry) return { ok: false, reason: 'owner not found' }
      ownerEntry.cardsInPlay = ownerEntry.cardsInPlay || []
      ownerEntry.cardsInPlay.push({ cardId: Number(topId), position: this.getOwnCastleZone(Number(ownerEntry.id)) })
      this.saveState()
      return { ok: true }
    } catch (e) {
      return { ok: false, reason: 'error' }
    }
  }

  getOwnCastleZone(playerId: number) {
    return playerId === 0 ? 0 : ZONES.length - 1
  }

  getEnemyCastleZone(playerId: number) {
    return playerId === 0 ? ZONES.length - 1 : 0
  }

  getSpawnZone(card: Card, playerId: number) {
    void card
    void playerId
    return 0
  }

  isWaterCard(card: Card) {
    return String((card as any)?.element || 'earth') === 'water'
  }

  canAct(p: number) {
    if (this.gameWorkflow.gameOver) return { ok: false, reason: 'game is over' }
    if (p !== this.gameWorkflow.activePlayerId) return { ok: false, reason: 'not your turn' }
    // Ensure the caller is the local player (owner) for this engine instance.
    // This prevents a client from acting as a different player than the one
    // assigned in `gameContext.playerId`.
    if (Number(p) !== Number(this.gameContext.playerId)) return { ok: false, reason: 'not your player' }
    const played = this.normalizePlayedThisRound(this.gameWorkflow.actionByPlayer)
    if (Boolean(played[p])) return { ok: false, reason: 'already played this round' }
    return { ok: true }
  }

  recordActionAndEndTurn(p: number, action = 'turnAction') {
    // mark action taken in workflow.actionByPlayer
    try { this.gameWorkflow.actionByPlayer = this.gameWorkflow.actionByPlayer || {} } catch (e) {}
    this.gameWorkflow.actionByPlayer[String(p)] = 'action-taken'
    this.saveState()
    const et = this.endTurn()
    return { ok: true, endTurn: et }
  }

  applyDamageToCard(attackerAtk: number, target: any) {
    
  }

  applyCastleDamageFromOwner(ownerId: number) {

  }

  shuffleDeck() {
    const deckArr = this.deck
    for (let i = deckArr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const tmp = deckArr[i]
      deckArr[i] = deckArr[j]
      deckArr[j] = tmp
    }
    this.deck = deckArr
    this.saveState()
  }

 


  // market and buy mechanics removed

  // Play a card from hand onto the board (position 0). Reveals the card.
  playCard(p: number, handIndex: number) {
    const can = this.canAct(p)
    if (!can.ok) { 
      return can
    }
    try {
      const player = this.gameContext.playersList[Number(p)]
      if (!player) return { ok: false, reason: 'player not found' }
      const handArr = Array.isArray(player.hand) ? player.hand : []
      const cidStr = String(handArr[Number(handIndex)] || '')
      if (!cidStr) return { ok: false, reason: 'card not found in hand' }
      // remove from hand
      try { handArr.splice(Number(handIndex), 1) } catch (_) {}
      player.hand = handArr
      // determine spawn zone
      const cardInst = this.cardsById[String(cidStr)]
      const spawnPos = this.getSpawnZone(cardInst as any, Number(p))
      player.cardsInPlay = player.cardsInPlay || []
      player.cardsInPlay.push({ cardId: Number(cidStr), position: Number(spawnPos) })
      // call handler
      try { if (cardInst && (cardInst as any).handler && typeof (cardInst as any).handler.onPlayed === 'function') { (cardInst as any).handler.onPlayed(String(cidStr), Number(p), Number(spawnPos), this) } } catch (_) {}
      this.saveState()
      return this.recordActionAndEndTurn(p, 'playCard')
    } catch (e) {
      return { ok: false, reason: 'error' }
    }
  }

  // Play a card from hand onto the board at a specific position (zone)
  playCardTo(p: number, handIndex: number, position: number) {
    const can = this.canAct(p)
    if (!can.ok) return can
    try {
      const player = this.gameContext.playersList[Number(p)]
      if (!player) return { ok: false, reason: 'player not found' }
      const handArr = Array.isArray(player.hand) ? player.hand : []
      const cidStr = String(handArr[Number(handIndex)] || '')
      if (!cidStr) return { ok: false, reason: 'card not found in hand' }
      try { handArr.splice(Number(handIndex), 1) } catch (_) {}
      player.hand = handArr
      player.cardsInPlay = player.cardsInPlay || []
      player.cardsInPlay.push({ cardId: Number(cidStr), position: Number(position) })
      const cardInst = this.cardsById[String(cidStr)]
      try { if (cardInst && (cardInst as any).handler && typeof (cardInst as any).handler.onPlayed === 'function') { (cardInst as any).handler.onPlayed(String(cidStr), Number(p), Number(position), this) } } catch (_) {}
      this.saveState()
      return this.recordActionAndEndTurn(p, 'playCardTo')
    } catch (e) {
      return { ok: false, reason: 'error' }
    }
  }

  // Move a specific card by up to `steps` positions (must be non-negative)
  moveCard(cardId: string, p: number, steps: number) {
    const can = this.canAct(p)
    if (!can.ok) return can
    try {
      const player = this.gameContext.playersList[Number(p)]
      if (!player) return { ok: false, reason: 'player not found' }
      const list = Array.isArray(player.cardsInPlay) ? player.cardsInPlay : []
      const cid = Number(cardId)
      const idx = list.findIndex((e: any) => Number((e as any).cardId ?? (e as any).id) === Number(cid))
      if (idx < 0) return { ok: false, reason: 'card not in play for player' }
      const entry = list[idx]
      const oldPos = Number((entry as any).position ?? 0)
      const newPos = Math.max(0, oldPos + Math.trunc(Number(steps) || 0))
      entry.position = newPos
      // call handler onMove
      const cardInst = this.cardsById[String(cid)]
      try { if (cardInst && (cardInst as any).handler && typeof (cardInst as any).handler.onMove === 'function') { (cardInst as any).handler.onMove(String(cardId), Number(p), Number(newPos), this) } } catch (_) {}
      this.saveState()
      return this.recordActionAndEndTurn(p, 'moveCard')
    } catch (e) {
      return { ok: false, reason: 'error' }
    }
  }

  // Attack a target card with an attacker card (both must be in play)
  attackCard(attackerId: string, targetId: string, p: number) {
    const can = this.canAct(p)
    if (!can.ok) return can
    return this.recordActionAndEndTurn(p, 'attackCard')
  }

  defendCard(cardId: string, p: number) {
    void cardId
    void p
    return { ok: false, reason: 'defend action is disabled' }
  }

  // Convert (steal) a target card into the attacker's ownership when attacker is a PRIEST
  convertCard(attackerId: string, targetId: string, p: number) {
    const can = this.canAct(p)
    if (!can.ok) return can
    return this.recordActionAndEndTurn(p, 'convertCard')
  }

  // Use a card's special ability (invokes command.onPlayed)
  useCardAbility(cardId: string, p: number, targetId?: string) {
    const can = this.canAct(p)
    if (!can.ok) return can
    return this.recordActionAndEndTurn(p, 'useCardAbility')
  }

  // Public: set whether automatic enemy attacks should be skipped for the next phase
  setSkipEnemyAttacks(value: boolean) {
    this._skipEnemyAttacks = !!value
  }

  nextPhase() {
    if (this.gameWorkflow.gameOver) return
    
  }

  // Advance active player (end current player's turn)
  endTurn() {
    
    return { ok: true, activePlayerId: this.gameWorkflow.activePlayerId, playerId: this.gameContext.playerId, round: this.gameWorkflow.round, gameOver: false }
  }

  // Persist internal state to localStorage (browser). Silent on failure.
  saveState() {
    this.syncGameStateService()
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem('tocabola:workflow', JSON.stringify(this.gameWorkflow))
      } catch (_) {}
      try {
        // Serialize GameContext to plain object for storage (engine.cardsById serialized separately)
        const ctx: any = {
          deck: this.gameContext.deck,
          playersList: this.gameContext.playersList,
          playerId: this.gameContext.playerId,
          actionByPlayer: this.gameContext.actionByPlayer
        }
        window.localStorage.setItem('tocabola:game', JSON.stringify(ctx))
      } catch (_) {}
      try {
        window.localStorage.setItem('tocabola:cardsById', JSON.stringify(this.cardsById))
      } catch (_) {}
    }

  }

  // Clear persisted storage entries that belong to the game and reset in-memory state.
  clearStoredState() {
    if (typeof window !== 'undefined' && window.localStorage) {
      const keysToRemove: string[] = []
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i)
        if (!key) continue
        window.localStorage.removeItem(key)
      }

    }
    this.reset();
    this.cardsById = {}
  }

  hasStoredState() {
    try {
      return !!this.loadState()
    } catch (_e) {
      return false
    }
  }

  // Attempt to load state from separated storage keys. Returns true if restored.
  loadState() {
    const storedGame = gameStateService.loadGameState()
    const storedWorkflow = gameStateService.loadWorkflowState()
    const storedCardsById = window.localStorage ? window.localStorage.getItem('tocabola:cardsById') : null
    if (!storedGame || !storedWorkflow) return false
    // `loadGameState` returns a GameContext instance (constructor handles Map conversion)
    this.gameContext = storedGame
    this.gameWorkflow = storedWorkflow
    // Restore runtime cardsById registry from stored serialized object, converting to Card instances
    if (storedCardsById) {
      try {
        const parsed = JSON.parse(storedCardsById || '{}')
        const out: Record<string, Card> = {}
        for (const k of Object.keys(parsed || {})) {
          try {
            const payload = parsed[k]
            out[String(k)] = (Card as any).fromJSON ? (Card as any).fromJSON(payload) : payload
          } catch (_) {}
        }
        this.cardsById = out
      } catch (_) {
        this.cardsById = {}
      }
    }
    
    return true
  }



  
}
