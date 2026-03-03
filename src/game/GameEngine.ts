import Card from '../models/Card'
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

export type PlayerState = {
  id: number
  name: string
}

function uuid() {
  return Math.random().toString(36).slice(2, 9)
}

export default class GameEngine {
  ZONES = ZONES
  deck: Card[] = []
  // market removed: cards are drawn/played directly from deck
  players: PlayerState[] = []
  cardsInPlay: GameCard[] = []
  playerId: number = 0
  round: number = 0
  hands: { [p: number]: Card[] } = {}
  playedThisRound: { [p: number]: boolean } = {}
  gameOver: boolean = false
  loserPlayerId: number | null = null
  winnerPlayerId: number | null = null
  gameContext: GameContext = new GameContext()
  gameWorkflow: GameWorkflowState = new GameWorkflowState()

  normalizePlayedThisRound(input: any) {
    const raw = (input && typeof input === 'object') ? input : {}
    const normalized: { [p: number]: boolean } = {}
    for (const key of Object.keys(raw)) {
      const playerId = Number(key)
      if (!Number.isFinite(playerId)) continue
      const value = raw[key]
      normalized[playerId] = value === true || value === 'action-taken' || value === 1
    }
    return normalized
  }

  syncGameStateService() {
    // Replace with GameContext instance usage
    const handsPayload: Record<string, any[]> = {}
    for (const playerId of Object.keys(this.hands || {})) {
      handsPayload[playerId] = (this.hands[Number(playerId)] || []).map(c => c.toJSON())
    }
    const workflow = {
      started: (this.players || []).length > 0,
      activePlayerId: this.gameWorkflow.activePlayerId,
      playerId: this.gameWorkflow.playerId,
      round: this.gameWorkflow.round,
      actionByPlayer: Object.fromEntries(Object.entries(this.playedThisRound || {}).map(([k, v]) => [k, v ? 'action-taken' : ''])),
      gameOver: this.gameWorkflow.gameOver,
      loserPlayerId: this.gameWorkflow.loserPlayerId,
      winnerPlayerId: this.gameWorkflow.winnerPlayerId
    };
    // Use workflow object as needed, e.g. this.gameContext.setWorkflow(workflow)
  }

  constructor(deck: Card[]) {
    this.deck = [...deck]
    this.gameContext = new GameContext()
    this.gameContext.setDeck(this.deck.map(d => d.toJSON()))
    // attempt to restore persisted state (if running in browser)
    try {
      const restored = this.loadState()
      if (!restored) {
        // persist initial deck so randomized HP is kept
        this.saveState('init')
      }
      this.syncGameStateService()
    } catch (e) {
      // ignore storage errors
      this.syncGameStateService()
    }
  }

  // revive top of deck into owner's castle
  reviveTopToCastle(owner: number) {
    if (!this.deck.length) return false
    const c = this.deck.shift()!
    this.cardsInPlay.push({ id: uuid(), card: c, ownerId: owner, position: this.getSpawnZone(c, owner), hidden: false })
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
    if (this.gameOver) return { ok: false, reason: 'game is over' }
    if (p !== this.gameWorkflow.activePlayerId) return { ok: false, reason: 'not your turn' }
    if (Boolean(this.playedThisRound[p])) return { ok: false, reason: 'already played this round' }
    return { ok: true }
  }

  recordActionAndEndTurn(p: number, action = 'turnAction') {
    this.playedThisRound[p] = true
    this.saveState(action)
    const et = this.endTurn()
    return { ok: true, endTurn: et }
  }

  applyDamageToCard(attackerAtk: number, target: GameCard) {
    const atk = Math.max(0, Number(attackerAtk || 0))
    const hp = Math.max(0, Number(target.card.hp || 0))
    const def = Math.max(0, Number(target.card.defensePoints || 0))
    if (hp + def < atk) {
      target.card.hp = 0
      return
    }
    const damage = Math.max(0, atk - def)
    target.card.hp = Math.max(0, hp - damage)
  }

  applyCastleDamageFromOwner(ownerId: number) {
    const enemyCastleZone = this.getEnemyCastleZone(ownerId)
    const attackers = this.cardsInPlay.filter(g => g.ownerId === ownerId && g.position === enemyCastleZone)
    if (!attackers.length) return
    const enemyId = this.players.find(p => p.id !== ownerId)?.id
    if (enemyId == null) return
    const totalAtk = attackers.reduce((sum, g) => sum + Math.max(0, Number(g.card.attackPoints || 0)), 0)
    const enemyMaxHp = Number(this.gameContext.castleMaxHp[enemyId] ?? 20)
    this.gameContext.castleHpByPlayer[enemyId] = Math.max(0, (this.gameContext.castleHpByPlayer[enemyId] ?? enemyMaxHp) - totalAtk)
    if (this.gameContext.castleHpByPlayer[enemyId] <= 0) {
      this.gameWorkflow.gameOver = true
      this.gameWorkflow.loserPlayerId = enemyId
      this.gameWorkflow.winnerPlayerId = ownerId
    }
  }

  shuffleDeck() {
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const tmp = this.deck[i]
      this.deck[i] = this.deck[j]
      this.deck[j] = tmp
    }
    this.saveState('shuffleDeck')
  }

  startGame(playerNames: string[] = ['Server', 'Client']) {
    // reset players and create a fresh deck from the sample deck
    this.players = playerNames.map((n, i) => ({ id: i, name: n }))
    // create a fresh randomized deck
    this.deck = deckService.createDeck()
    this.gameContext.setDeck(this.deck.map(d => d.toJSON()))
    // shuffle the deck so order is randomized at game start
    this.shuffleDeck()
    this.cardsInPlay = []
    // initialize hands: deal 7 cards to each player (secret)
    this.hands = {}
    for (let i = 0; i < this.players.length; i++) this.hands[i] = []
    for (let p = 0; p < this.players.length; p++) {
      for (let k = 0; k < 5 && this.deck.length; k++) {
        this.hands[p].push(this.deck.shift()!)
      }
    }
    // Populate GameContext with player hands so UI components can read player cards
    const handsPayload: Record<string, any[]> = {}
    for (const pid of Object.keys(this.hands)) {
      handsPayload[pid] = (this.hands[Number(pid)] || []).map(c => c.toJSON())
    }
    this.gameContext.setAllPlayerCards(handsPayload)
    this.gameContext.started = true
    this.gameContext.playerId = this.playerId
    // market phase removed
    this.gameWorkflow.activePlayerId = 0
    this.playerId = this.gameWorkflow.activePlayerId
    this.round = 0
    this.playedThisRound = {}
    this.gameContext.castleMaxHp = {}
    for (let i = 0; i < this.players.length; i++) this.gameContext.castleMaxHp[i] = 20
    this.gameContext.castleHpByPlayer = {}
    for (let i = 0; i < this.players.length; i++) this.gameContext.castleHpByPlayer[i] = this.gameContext.castleMaxHp[i]
    this.gameWorkflow.gameOver = false
    this.gameWorkflow.loserPlayerId = null
    this.gameWorkflow.winnerPlayerId = null
    // Create workflow object and set playerId
    const workflow = { playerId: this.playerId };
    this.saveState('startGame')
  }

  // market and buy mechanics removed

  // Play a card from hand onto the board (position 0). Reveals the card.
  playCard(p: number, handIndex: number) {
    const can = this.canAct(p)
    if (!can.ok) return can
    const hand = this.hands[p] || []
    if (handIndex < 0 || handIndex >= hand.length) return { ok: false, reason: 'invalid hand index' }
    const card = hand.splice(handIndex, 1)[0]
    this.cardsInPlay.push({ id: uuid(), card, ownerId: p, position: this.getSpawnZone(card, p), hidden: false })
    return this.recordActionAndEndTurn(p, 'playCard')
  }

  // Play a card from hand onto the board at a specific position (zone)
  playCardTo(p: number, handIndex: number, position: number) {
    const can = this.canAct(p)
    if (!can.ok) return can
    const hand = this.hands[p] || []
    if (handIndex < 0 || handIndex >= hand.length) 
      return { ok: false, reason: 'invalid hand index' }
    if (!Number.isFinite(position) || position < 0 || position >= ZONES.length) return { ok: false, reason: 'invalid position' }
    const spawn = this.getSpawnZone(hand[handIndex], p)
    if (position !== spawn) return { ok: false, reason: 'cards must be played in zone 0' }
    const card = hand.splice(handIndex, 1)[0]
    this.cardsInPlay.push({ id: uuid(), card, ownerId: p, position: this.getSpawnZone(card, this.playerId), hidden: false })
    return this.recordActionAndEndTurn(p, 'playCardTo')
  }

  // Move a specific card by up to `steps` positions (must be non-negative)
  moveCard(cardId: string, p: number, steps: number) {
    const can = this.canAct(p)
    if (!can.ok) return can
    const g = this.cardsInPlay.find(c => c.id === cardId)
    if (!g) return { ok: false, reason: 'card not found' }
    if (g.ownerId !== p) return { ok: false, reason: 'not your card' }
    if (!Number.isFinite(steps) || steps < 0) return { ok: false, reason: 'invalid steps' }
    const maxSteps = g.card.velocity ?? 0
    if (steps > maxSteps) return { ok: false, reason: 'exceeds velocity' }
    const direction = p === 0 ? 1 : -1
    const pathPositions: number[] = []
    let next = g.position
    for (let i = 0; i < Math.trunc(steps); i++) {
      next += direction
      if (next < 0 || next >= ZONES.length) break
      pathPositions.push(next)
    }
    if (this.isWaterCard(g.card)) {
      const invalid = pathPositions.some(pos => ZONE_ELEMENTS[pos] !== 'water')
      if (invalid) return { ok: false, reason: 'boats can only move through water zones' }
    }
    if (pathPositions.length) g.position = pathPositions[pathPositions.length - 1]
    // trigger onMoved command if present
    try {
      const cmd = getCommandFor(g.card.title || '')
      if (cmd && cmd.onMoved) cmd.onMoved(this, g, p, steps)
    } catch (e) {
      // ignore command errors
    }
    return this.recordActionAndEndTurn(p, 'moveCard')
  }

  // Attack a target card with an attacker card (both must be in play)
  attackCard(attackerId: string, targetId: string, p: number) {
    const can = this.canAct(p)
    if (!can.ok) return can
    const attacker = this.cardsInPlay.find(c => c.id === attackerId)
    const target = this.cardsInPlay.find(c => c.id === targetId)
    if (!attacker || !target) return { ok: false, reason: 'card not found' }
    if (attacker.ownerId !== p) return { ok: false, reason: 'not your attacker' }
    const dist = Math.abs(target.position - attacker.position)
    if (dist > (attacker.card.range ?? 0)) return { ok: false, reason: 'target out of range' }
    // allow attacker command to override attack behavior
    let handled = false
    try {
      const cmd = getCommandFor(attacker.card.title || '')
      if (cmd && cmd.onAttack) {
        const res = cmd.onAttack(this, attacker, target, p)
        if (res && res.handled) handled = true
        if (res && typeof res.overrideDamage === 'number') {
          const ignore = !!res.ignoreDefense
          const actual = ignore ? res.overrideDamage : Math.max(0, res.overrideDamage - (target.card.defensePoints ?? 0))
          target.card.hp = Math.max(0, target.card.hp - actual)
          handled = true
        }
      }
    } catch (e) {
      // ignore
    }
    if (!handled) {
      this.applyDamageToCard(attacker.card.attackPoints ?? 0, target)
    }
    // remove dead cards
    this.cardsInPlay = this.cardsInPlay.filter(g => g.card.hp > 0)
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
    const g = this.cardsInPlay.find(c => c.id === attackerId)
    if (!g) return { ok: false, reason: 'card not found' }
    if (g.ownerId !== p) return { ok: false, reason: 'not your card' }
    try {
      const cmd = getCommandFor(g.card.title || '')
      if (cmd && cmd.onPlayed) {
        const res = cmd.onPlayed(this, g, p, targetId)
        if (res && res.ok === false) return res
      } else {
        return { ok: false, reason: 'ability not implemented' }
      }
    } catch (e) {
      return { ok: false, reason: String(e) }
    }
    // cleanup dead units and persist
    this.cardsInPlay = this.cardsInPlay.filter(g2 => g2.card.hp > 0)
    return this.recordActionAndEndTurn(p, 'convertCard')
  }

  nextPhase() {
    if (this.gameOver) return
    // Enemy automatic movement: move only non-player cards (ownerId !== 0)
    const maxPos = ZONES.length - 1
    for (const g of this.cardsInPlay.filter(c => c.ownerId !== 0)) {
      const newPos = Math.min(maxPos, g.position + Math.max(0, g.card.velocity))
      g.position = newPos
    }

    // Enemy automatic attacks: enemy cards attack player cards within range
    for (const attacker of [...this.cardsInPlay].filter(c => c.ownerId !== 0)) {
      const enemies = this.cardsInPlay.filter(e => e.ownerId === 0)
      for (const enemy of enemies) {
        const dist = Math.abs(enemy.position - attacker.position)
        if (dist <= (attacker.card.range ?? 0)) {
          enemy.card.hp = Math.max(0, enemy.card.hp - (attacker.card.attackPoints ?? 0))
        }
      }
    }

    // remove dead cards
    this.cardsInPlay = this.cardsInPlay.filter(g => g.card.hp > 0)
    this.saveState('nextPhase')
  }

  // Advance active player (end current player's turn)
  endTurn() {
    if (this.gameOver) {
      this.saveState('endTurn')
      return { ok: true, activePlayerId: this.gameWorkflow.activePlayerId, playerId: this.gameWorkflow.playerId, round: this.gameWorkflow.round, gameOver: true, winnerPlayerId: this.gameWorkflow.winnerPlayerId, loserPlayerId: this.gameWorkflow.loserPlayerId }
    }
    const previousPlayerId = this.gameWorkflow.activePlayerId
    this.applyCastleDamageFromOwner(previousPlayerId)
    if (this.gameOver) {
      this.saveState('endTurn')
      return { ok: true, activePlayerId: this.gameWorkflow.activePlayerId, playerId: this.gameWorkflow.playerId, round: this.gameWorkflow.round, gameOver: true, winnerPlayerId: this.gameWorkflow.winnerPlayerId, loserPlayerId: this.gameWorkflow.loserPlayerId }
    }
    if (!this.players || !this.players.length) return { ok: false, reason: 'no players' }
    this.gameWorkflow.activePlayerId = (this.gameWorkflow.activePlayerId + 1) % this.players.length
    this.gameWorkflow.playerId = this.gameWorkflow.activePlayerId
    this.playedThisRound[this.gameWorkflow.activePlayerId] = false
    if (this.gameWorkflow.activePlayerId === 0) {
      this.gameWorkflow.round = (Number.isFinite(this.gameWorkflow.round) ? this.gameWorkflow.round : 0) + 1
      this.playedThisRound = {}
    }
    this.saveState('endTurn')
    return { ok: true, activePlayerId: this.gameWorkflow.activePlayerId, playerId: this.gameWorkflow.playerId, round: this.gameWorkflow.round, gameOver: false }
  }

  // Persist internal state to localStorage (browser). Silent on failure.
  saveState(action = 'stateUpdate') {
    this.syncGameStateService()
    
      try {
        // TODO: create a history entry and persist it to workflow
        const historyEntry = {
          action: String(action || 'stateUpdate'),
          activePlayerId: Number(this.gameWorkflow.activePlayerId || 0),
          round: Number(this.gameWorkflow.round || 0),
          gameOver: Boolean(this.gameWorkflow.gameOver),
          deckCount: Math.max(0, Number(this.deck?.length || 0)),
        }

   
        gameStateService.saveWorkflowState(this.gameWorkflow)
        gameStateService.saveGameState(this.gameContext)

        return true
      } catch (e) {
        return false
    }
  }

  hasStoredState() {
    try {
      const storedGame = gameStateService.loadGameState()
      const storedWorkflow = gameStateService.loadWorkflowState()
      return !!(storedGame || storedWorkflow)
    } catch (_e) {
      return false
    }
  }

  ensureStoredState(playerNames: string[] = ['Server', 'Client']) {
    const restored = this.loadState()
    if (restored) {
      this.syncGameStateService()
      return { ok: true, restored: true }
    }
    this.startGame(playerNames)
    return { ok: true, restored: false }
  }

  // Attempt to load state from separated storage keys. Returns true if restored.
  loadState() {
    try {
      if (typeof window === 'undefined') return false
      const storedGame = gameStateService.loadGameState()
      const storedWorkflow = gameStateService.loadWorkflowState()
      if (!storedGame) return false

      const obj: any = storedGame

      // reconstruct basic game structures
      this.deck = (obj.deck || []).map((c: any) => Card.fromJSON(c))
      this.players = obj.players || []
      this.cardsInPlay = (obj.cardsInPlay || []).map((g: any) => ({ id: g.id, ownerId: g.ownerId, position: g.position, hidden: !!g.hidden, card: Card.fromJSON(g.card) }))

      // restore hands
      this.hands = {}
      const rawHands = obj.hands || {}
      for (const k of Object.keys(rawHands)) this.hands[Number(k)] = (rawHands[k] || []).map((c: any) => Card.fromJSON(c))

      // ensure GameContext has the same player hands representation
      const handsPayload: Record<string, any[]> = {}
      for (const k of Object.keys(this.hands)) {
        handsPayload[k] = (this.hands[Number(k)] || []).map(c => c.toJSON())
      }
      this.gameContext.setAllPlayerCards(handsPayload)

      // workflow & gameplay metadata
      this.gameWorkflow.playerId = Number(obj.playerId ?? this.gameWorkflow.playerId)
      this.gameWorkflow.round = obj.round ?? this.gameWorkflow.round
      this.playedThisRound = this.normalizePlayedThisRound(obj.playedThisRound)

      // castle hp/max (handle object or legacy numeric max)
      if (obj.castleMaxHp && typeof obj.castleMaxHp === 'object') {
        this.gameContext.castleMaxHp = obj.castleMaxHp
      } else {
        const legacyMax = Number(obj.castleMaxHp || 20)
        this.gameContext.castleMaxHp = Object.fromEntries(Object.keys(this.gameContext.castleHpByPlayer || { 0: 0, 1: 0 }).map((k) => [Number(k), legacyMax]))
      }
      this.gameContext.castleHpByPlayer = obj.castleHpByPlayer || this.gameContext.castleHpByPlayer

      this.gameWorkflow.gameOver = !!obj.gameOver
      this.gameWorkflow.loserPlayerId = obj.loserPlayerId == null ? null : Number(obj.loserPlayerId)
      this.gameWorkflow.winnerPlayerId = obj.winnerPlayerId == null ? null : Number(obj.winnerPlayerId)

      // overlay any stored workflow (adds history, last action, etc.)
      if (storedWorkflow) {
        try { Object.assign(this.gameWorkflow, storedWorkflow) } catch (_e) {}
      }

      return true
    } catch (e) {
      return false
    }
  }



  // Import state from parsed JSON and persist it
  importState(obj: any) {
    if (!obj) return { ok: false, reason: 'invalid object' }
    try {
      this.deck = (obj.deck || []).map((c: any) => Card.fromJSON(c))
      this.players = obj.players || []
      this.cardsInPlay = (obj.cardsInPlay || []).map((g: any) => ({ id: g.id, ownerId: g.ownerId, position: g.position, hidden: !!g.hidden, card: Card.fromJSON(g.card) }))
      this.hands = {}
      const rawHands = obj.hands || {}
      for (const k of Object.keys(rawHands)) {
        this.hands[Number(k)] = (rawHands[k] || []).map((c: any) => Card.fromJSON(c))
      }
      this.gameContext = new GameContext(obj.castleHpByPlayer || this.gameContext.castleHpByPlayer)
      // populate gameContext players from hands when importing
      const handsPayload2: Record<string, any[]> = {}
      for (const k of Object.keys(this.hands)) {
        handsPayload2[k] = (this.hands[Number(k)] || []).map(c => c.toJSON())
      }
      this.gameContext.setAllPlayerCards(handsPayload2)
      this.gameWorkflow = new GameWorkflowState(obj.workflow || {})
      this.saveState('importState')
      return { ok: true }
    } catch (e) {
      return { ok: false, reason: String(e) }
    }
  }
}
