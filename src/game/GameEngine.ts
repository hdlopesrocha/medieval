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
    const initialIds: number[] = []
    // register cards and collect ids
    this.cardsById = {}
    for (const c of initialDeck) {
      this.cardsById[c.id] = c 
      initialIds.push(c.id)
    }

    // If there is saved state, prefer loading that; otherwise create fresh context
    if (!this.loadState()) {
      // create new workflow and context
      this.gameWorkflow = new GameWorkflowState()
      this.gameContext = new GameContext()

      // Shuffle the registered ids and assign as deck
      const deckArr: number[] = initialIds.slice()
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
        // persist as number ids to be compatible with persisted shape
        p.hand = handIds

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

    return true
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
    const atk = Math.max(0, Number(attackerAtk || 0))
    if (!target) return
    // Resolve card instance when stored as id
    let cardObj: any = undefined
    try {
      if (typeof (target.card) === 'string') {
        cardObj = this.cardsById[target.card]
      } else {
        cardObj = target.card
      }
    } catch (_) {
      cardObj = target.card
    }
    const hp = Math.max(0, Number((cardObj && cardObj.hp) || 0))
    const def = Math.max(0, Number((cardObj && cardObj.defensePoints) || 0))
    if (hp + def < atk) {
      if (cardObj) cardObj.hp = 0
      try { if (cardObj && (cardObj as any).handler && typeof (cardObj as any).handler.onKilled === 'function') { (cardObj as any).handler.onKilled(String(target.id || ''), Number(target.ownerId || 0), this) } } catch (_) {}
      return
    }
    const damage = Math.max(0, atk - def)
    if (cardObj) cardObj.hp = Math.max(0, hp - damage)
    if ((cardObj && cardObj.hp) <= 0) {
      try { if (cardObj && (cardObj as any).handler && typeof (cardObj as any).handler.onKilled === 'function') { (cardObj as any).handler.onKilled(String(target.id || ''), Number(target.ownerId || 0), this) } } catch (_) {}
    }
  }

  applyCastleDamageFromOwner(ownerId: number) {
    const enemyCastleZone = this.getEnemyCastleZone(ownerId)
    const attackers = (this.gameContext.cardsInPlay || []).filter((g: any) => g.ownerId === ownerId && g.position === enemyCastleZone)
    if (!attackers.length) return
    const enemy = this.players.find(p => p.id !== ownerId)
    if (!enemy) return
    const enemyId = Number(enemy.id)
    const totalAtk = attackers.reduce((sum: number, g: any) => sum + Math.max(0, Number(((g.card && (g.card.attackPoints)) || (this.cardsById[String(g.card || '')]?.attackPoints) || 0))), 0)
    const enemyMaxHp = Number((enemy.castleMaxHp != null) ? enemy.castleMaxHp : 20)
    enemy.castleHp = Math.max(0, (Number(enemy.castleHp ?? enemyMaxHp)) - totalAtk)
    if (Number(enemy.castleHp) <= 0) {
      this.gameWorkflow.gameOver = true
      this.gameWorkflow.loserPlayerId = enemyId
      this.gameWorkflow.winnerPlayerId = ownerId
    }
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
      const hand = this.getPlayerCards(p) || []
      const card = hand[Number(handIndex)]
      if (card && (card as any).handler && typeof (card as any).handler.onPlayed === 'function') {
        const cid = this.getCardId(card)
        try { (card as any).handler.onPlayed(cid || '', p, 0, this) } catch (_) {}
      }
    } catch (_) {}
    return this.recordActionAndEndTurn(p, 'playCard')
  }

  // Play a card from hand onto the board at a specific position (zone)
  playCardTo(p: number, handIndex: number, position: number) {
    const can = this.canAct(p)
    if (!can.ok) return can
    return this.recordActionAndEndTurn(p, 'playCardTo')
  }

  // Move a specific card by up to `steps` positions (must be non-negative)
  moveCard(cardId: string, p: number, steps: number) {
    const can = this.canAct(p)
    if (!can.ok) return can
    return this.recordActionAndEndTurn(p, 'moveCard')
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
      window.localStorage.setItem('tocabola:workflow', JSON.stringify(this.gameWorkflow))
      window.localStorage.setItem('tocabola:game', JSON.stringify(this.gameContext)) 
      window.localStorage.setItem('tocabola:cardsById', JSON.stringify(this.cardsById)) 
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
    if (!storedGame || !storedWorkflow || !storedCardsById) 
      return false
    this.gameContext = storedGame
    this.gameWorkflow = storedWorkflow
    this.cardsById = JSON.parse(storedCardsById)
    
    return true
  }



  
}
