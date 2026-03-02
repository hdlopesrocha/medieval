import Card from '../models/Card'
import { CardType } from '../models/Card'
import { getCommandFor } from './commands/registry'
import gameStateService from '../services/gameStateService'
import deckService from '../services/deckService'


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
  storageKey = 'tocabola_game_state_v1'
  activePlayerId: number = 0
  round: number = 1
  hands: { [playerId: number]: Card[] } = {}
  playedThisRound: { [playerId: number]: boolean } = {}
  castleMaxHp: number = 20
  castleHpByPlayer: { [playerId: number]: number } = { 0: 20, 1: 20 }
  gameOver: boolean = false
  loserPlayerId: number | null = null
  winnerPlayerId: number | null = null

  syncGameStateService() {
    gameStateService.setDeck(this.deck.map(d => d.toJSON()), 'game')
    const handsPayload: Record<string, any[]> = {}
    for (const playerId of Object.keys(this.hands || {})) {
      handsPayload[playerId] = (this.hands[Number(playerId)] || []).map(c => c.toJSON())
    }
    gameStateService.setAllPlayerCards(handsPayload, 'game')
    gameStateService.setWorkflow({
      started: (this.players || []).length > 0,
      activePlayerId: this.activePlayerId,
      round: this.round,
      lastAction: '',
      actionByPlayer: Object.fromEntries(Object.entries(this.playedThisRound || {}).map(([k, v]) => [k, v ? 'action-taken' : ''])),
      castleHpByPlayer: Object.fromEntries(Object.entries(this.castleHpByPlayer || {}).map(([k, v]) => [k, Number(v)])),
      castleMaxHp: this.castleMaxHp,
      gameOver: this.gameOver,
      loserPlayerId: this.loserPlayerId,
      winnerPlayerId: this.winnerPlayerId
    }, 'game')
  }

  constructor(deck: Card[]) {
    this.deck = [...deck]
    gameStateService.setDeck(this.deck.map(d => d.toJSON()), 'game')
    // attempt to restore persisted state (if running in browser)
    try {
      const restored = this.loadState()
      if (!restored) {
        // persist initial deck so randomized HP is kept
        this.saveState()
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
    if (String((card as any)?.element || 'earth') === 'water') {
      return playerId === 0 ? 3 : 4
    }
    return this.getOwnCastleZone(playerId)
  }

  isWaterCard(card: Card) {
    return String((card as any)?.element || 'earth') === 'water'
  }

  canAct(playerId: number) {
    if (this.gameOver) return { ok: false, reason: 'game is over' }
    if (playerId !== this.activePlayerId) return { ok: false, reason: 'not your turn' }
    if (this.playedThisRound[playerId]) return { ok: false, reason: 'already played this round' }
    return { ok: true }
  }

  recordActionAndEndTurn(playerId: number) {
    this.playedThisRound[playerId] = true
    this.saveState()
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
    this.castleHpByPlayer[enemyId] = Math.max(0, (this.castleHpByPlayer[enemyId] ?? this.castleMaxHp) - totalAtk)
    if (this.castleHpByPlayer[enemyId] <= 0) {
      this.gameOver = true
      this.loserPlayerId = enemyId
      this.winnerPlayerId = ownerId
    }
  }

  shuffleDeck() {
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const tmp = this.deck[i]
      this.deck[i] = this.deck[j]
      this.deck[j] = tmp
    }
    this.saveState()
  }

  startGame(playerNames: string[] = ['Server', 'Client']) {
    // reset players and create a fresh deck from the sample deck
    this.players = playerNames.map((n, i) => ({ id: i, name: n }))
    // create a fresh randomized deck
    this.deck = deckService.createDeck()
    gameStateService.setDeck(this.deck.map(d => d.toJSON()), 'game')
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
    // market phase removed
    this.activePlayerId = 0
    this.round = 1
    this.playedThisRound = {}
    this.castleHpByPlayer = {}
    for (let i = 0; i < this.players.length; i++) this.castleHpByPlayer[i] = this.castleMaxHp
    this.gameOver = false
    this.loserPlayerId = null
    this.winnerPlayerId = null
    this.saveState()
  }

  // market and buy mechanics removed

  // Play a card from hand onto the board (position 0). Reveals the card.
  playCard(playerId: number, handIndex: number) {
    const can = this.canAct(playerId)
    if (!can.ok) return can
    const hand = this.hands[playerId] || []
    if (handIndex < 0 || handIndex >= hand.length) return { ok: false, reason: 'invalid hand index' }
    const card = hand.splice(handIndex, 1)[0]
    this.cardsInPlay.push({ id: uuid(), card, ownerId: playerId, position: this.getSpawnZone(card, playerId), hidden: false })
    return this.recordActionAndEndTurn(playerId)
  }

  // Play a card from hand onto the board at a specific position (zone)
  playCardTo(playerId: number, handIndex: number, position: number) {
    const can = this.canAct(playerId)
    if (!can.ok) return can
    const hand = this.hands[playerId] || []
    if (handIndex < 0 || handIndex >= hand.length) return { ok: false, reason: 'invalid hand index' }
    if (!Number.isFinite(position) || position < 0 || position >= ZONES.length) return { ok: false, reason: 'invalid position' }
    const spawn = this.getOwnCastleZone(playerId)
    if (position !== spawn) return { ok: false, reason: 'cards must be played in your castle' }
    const card = hand.splice(handIndex, 1)[0]
    this.cardsInPlay.push({ id: uuid(), card, ownerId: playerId, position: this.getSpawnZone(card, playerId), hidden: false })
    return this.recordActionAndEndTurn(playerId)
  }

  // Move a specific card by up to `steps` positions (must be non-negative)
  moveCard(cardId: string, playerId: number, steps: number) {
    const can = this.canAct(playerId)
    if (!can.ok) return can
    const g = this.cardsInPlay.find(c => c.id === cardId)
    if (!g) return { ok: false, reason: 'card not found' }
    if (g.ownerId !== playerId) return { ok: false, reason: 'not your card' }
    if (!Number.isFinite(steps) || steps < 0) return { ok: false, reason: 'invalid steps' }
    const maxSteps = g.card.velocity ?? 0
    if (steps > maxSteps) return { ok: false, reason: 'exceeds velocity' }
    const direction = playerId === 0 ? 1 : -1
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
      if (cmd && cmd.onMoved) cmd.onMoved(this, g, playerId, steps)
    } catch (e) {
      // ignore command errors
    }
    return this.recordActionAndEndTurn(playerId)
  }

  // Attack a target card with an attacker card (both must be in play)
  attackCard(attackerId: string, targetId: string, playerId: number) {
    const can = this.canAct(playerId)
    if (!can.ok) return can
    const attacker = this.cardsInPlay.find(c => c.id === attackerId)
    const target = this.cardsInPlay.find(c => c.id === targetId)
    if (!attacker || !target) return { ok: false, reason: 'card not found' }
    if (attacker.ownerId !== playerId) return { ok: false, reason: 'not your attacker' }
    const dist = Math.abs(target.position - attacker.position)
    if (dist > (attacker.card.range ?? 0)) return { ok: false, reason: 'target out of range' }
    // allow attacker command to override attack behavior
    let handled = false
    try {
      const cmd = getCommandFor(attacker.card.title || '')
      if (cmd && cmd.onAttack) {
        const res = cmd.onAttack(this, attacker, target, playerId)
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
    return this.recordActionAndEndTurn(playerId)
  }

  defendCard(cardId: string, playerId: number) {
    const can = this.canAct(playerId)
    if (!can.ok) return can
    const g = this.cardsInPlay.find(c => c.id === cardId)
    if (!g) return { ok: false, reason: 'card not found' }
    if (g.ownerId !== playerId) return { ok: false, reason: 'not your card' }
    g.card.defensePoints = Math.max(0, Number(g.card.defensePoints || 0) + 1)
    return this.recordActionAndEndTurn(playerId)
  }

  // Convert (steal) a target card into the attacker's ownership when attacker is a PRIEST
  convertCard(attackerId: string, targetId: string, playerId: number) {
    const can = this.canAct(playerId)
    if (!can.ok) return can
    const g = this.cardsInPlay.find(c => c.id === attackerId)
    if (!g) return { ok: false, reason: 'card not found' }
    if (g.ownerId !== playerId) return { ok: false, reason: 'not your card' }
    try {
      const cmd = getCommandFor(g.card.title || '')
      if (cmd && cmd.onPlayed) {
        const res = cmd.onPlayed(this, g, playerId, targetId)
        if (res && res.ok === false) return res
      } else {
        return { ok: false, reason: 'ability not implemented' }
      }
    } catch (e) {
      return { ok: false, reason: String(e) }
    }
    // cleanup dead units and persist
    this.cardsInPlay = this.cardsInPlay.filter(g2 => g2.card.hp > 0)
    return this.recordActionAndEndTurn(playerId)
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
    this.saveState()
  }

  // Advance active player (end current player's turn)
  endTurn() {
    if (this.gameOver) {
      this.saveState()
      return { ok: true, activePlayerId: this.activePlayerId, round: this.round, gameOver: true, winnerPlayerId: this.winnerPlayerId, loserPlayerId: this.loserPlayerId }
    }
    const previousPlayerId = this.activePlayerId
    this.applyCastleDamageFromOwner(previousPlayerId)
    if (this.gameOver) {
      this.saveState()
      return { ok: true, activePlayerId: this.activePlayerId, round: this.round, gameOver: true, winnerPlayerId: this.winnerPlayerId, loserPlayerId: this.loserPlayerId }
    }
    if (!this.players || !this.players.length) return { ok: false, reason: 'no players' }
    this.activePlayerId = (this.activePlayerId + 1) % this.players.length
    if (this.activePlayerId === 0) {
      this.round = (this.round || 1) + 1
      this.playedThisRound = {}
    }
    this.saveState()
    return { ok: true, activePlayerId: this.activePlayerId, round: this.round, gameOver: false }
  }

  // Persist internal state to localStorage (browser). Silent on failure.
  saveState() {
    this.syncGameStateService()
    try {
      if (typeof window === 'undefined' || !window.localStorage) return false
      const payload = {
        deck: this.deck.map(d => d.toJSON()),
        players: this.players,
        cardsInPlay: this.cardsInPlay.map(g => ({ id: g.id, ownerId: g.ownerId, position: g.position, hidden: !!g.hidden, card: g.card.toJSON() })),
        hands: Object.fromEntries(Object.entries(this.hands || {}).map(([k, arr]) => [k, arr.map(c => c.toJSON())])),
        activePlayerId: this.activePlayerId,
        round: this.round,
        playedThisRound: this.playedThisRound || {},
        castleMaxHp: this.castleMaxHp,
        castleHpByPlayer: this.castleHpByPlayer,
        gameOver: this.gameOver,
        loserPlayerId: this.loserPlayerId,
        winnerPlayerId: this.winnerPlayerId
      }
      window.localStorage.setItem(this.storageKey, JSON.stringify(payload))
      return true
    } catch (e) {
      return false
    }
  }

  // Attempt to load state from localStorage. Returns true if restored.
  loadState() {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return false
      const raw = window.localStorage.getItem(this.storageKey)
      if (!raw) return false
      const obj = JSON.parse(raw)
      if (!obj) return false
      // reconstruct cards
      this.deck = (obj.deck || []).map((c: any) => Card.fromJSON(c))
      this.players = obj.players || []
      this.cardsInPlay = (obj.cardsInPlay || []).map((g: any) => ({ id: g.id, ownerId: g.ownerId, position: g.position, hidden: !!g.hidden, card: Card.fromJSON(g.card) }))
      this.hands = {}
      const rawHands = obj.hands || {}
      for (const k of Object.keys(rawHands)) {
        this.hands[Number(k)] = (rawHands[k] || []).map((c: any) => Card.fromJSON(c))
      }
      this.activePlayerId = obj.activePlayerId ?? this.activePlayerId
      this.round = obj.round ?? this.round
      this.playedThisRound = obj.playedThisRound || {}
      this.castleMaxHp = Number(obj.castleMaxHp || this.castleMaxHp)
      this.castleHpByPlayer = obj.castleHpByPlayer || this.castleHpByPlayer
      this.gameOver = !!obj.gameOver
      this.loserPlayerId = obj.loserPlayerId == null ? null : Number(obj.loserPlayerId)
      this.winnerPlayerId = obj.winnerPlayerId == null ? null : Number(obj.winnerPlayerId)
      return true
    } catch (e) {
      return false
    }
  }

  // Export a full JSON-serializable snapshot (full card data)
  exportState() {
      return {
      deck: this.deck.map(d => d.toJSON()),
      players: this.players,
      cardsInPlay: this.cardsInPlay.map(g => ({ id: g.id, ownerId: g.ownerId, position: g.position, hidden: !!g.hidden, card: g.card.toJSON() })),
      hands: Object.fromEntries(Object.entries(this.hands || {}).map(([k, arr]) => [k, arr.map((c: Card) => c.toJSON())])),
      activePlayerId: this.activePlayerId,
      round: this.round,
      playedThisRound: this.playedThisRound || {},
      castleMaxHp: this.castleMaxHp,
      castleHpByPlayer: this.castleHpByPlayer,
      gameOver: this.gameOver,
      loserPlayerId: this.loserPlayerId,
      winnerPlayerId: this.winnerPlayerId
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
      this.activePlayerId = obj.activePlayerId ?? this.activePlayerId
      this.round = obj.round ?? this.round
      this.playedThisRound = obj.playedThisRound || {}
      this.castleMaxHp = Number(obj.castleMaxHp || this.castleMaxHp)
      this.castleHpByPlayer = obj.castleHpByPlayer || this.castleHpByPlayer
      this.gameOver = !!obj.gameOver
      this.loserPlayerId = obj.loserPlayerId == null ? null : Number(obj.loserPlayerId)
      this.winnerPlayerId = obj.winnerPlayerId == null ? null : Number(obj.winnerPlayerId)
      this.saveState()
      return { ok: true }
    } catch (e) {
      return { ok: false, reason: String(e) }
    }
  }

  getState() {
    return {
      activePlayerId: this.activePlayerId,
      round: this.round,
      deckCount: this.deck.length,
      // market removed
      players: this.players,
      cardsInPlay: this.cardsInPlay.map(g => ({ id: g.id, ownerId: g.ownerId, position: g.position, hidden: !!g.hidden, card: g.card.toJSON() })),
      playedThisRound: this.playedThisRound || {},
      castleMaxHp: this.castleMaxHp,
      castleHpByPlayer: this.castleHpByPlayer,
      gameOver: this.gameOver,
      loserPlayerId: this.loserPlayerId,
      winnerPlayerId: this.winnerPlayerId
    }
  }
}
