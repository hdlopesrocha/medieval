import Card from '../models/Card'
import { CardType } from '../models/Card'
import { getCommandFor } from './commands/registry'
import { createInitialDeck } from '../data/sampleDeck'


export const ZONES = [
  'My Castle',
  'My Village',
  'My Farm',
  'My Country (Open Field)',
  'Enemy Country (Open Field)',
  'Enemy Farms',
  'Enemy Village',
  'Enemy Castle'
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
  deck: Card[] = []
  // market removed: cards are drawn/played directly from deck
  players: PlayerState[] = []
  cardsInPlay: GameCard[] = []
  storageKey = 'tocabola_game_state_v1'
  activePlayerId: number = 0
  round: number = 1
  hands: { [playerId: number]: Card[] } = {}
  playedThisRound: { [playerId: number]: boolean } = {}

  constructor(deck: Card[]) {
    this.deck = [...deck]
    // attempt to restore persisted state (if running in browser)
    try {
      const restored = this.loadState()
      if (!restored) {
        // persist initial deck so randomized HP is kept
        this.saveState()
      }
    } catch (e) {
      // ignore storage errors
    }
  }

  // revive top of deck into owner's castle
  reviveTopToCastle(owner: number) {
    if (!this.deck.length) return false
    const c = this.deck.shift()!
    this.cardsInPlay.push({ id: uuid(), card: c, ownerId: owner, position: 0, hidden: false })
    return true
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

  startGame(playerNames: string[] = ['You', 'Enemy']) {
    // reset players and create a fresh deck from the sample deck
    this.players = playerNames.map((n, i) => ({ id: i, name: n }))
    // create a fresh randomized deck
    this.deck = createInitialDeck()
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
    this.saveState()
  }

  // market and buy mechanics removed

  // Play a card from hand onto the board (position 0). Reveals the card.
  playCard(playerId: number, handIndex: number) {
    if (playerId !== this.activePlayerId) return { ok: false, reason: 'not your turn' }
    if (this.playedThisRound[playerId]) return { ok: false, reason: 'already played this round' }
    const hand = this.hands[playerId] || []
    if (handIndex < 0 || handIndex >= hand.length) return { ok: false, reason: 'invalid hand index' }
    const card = hand.splice(handIndex, 1)[0]
    this.cardsInPlay.push({ id: uuid(), card, ownerId: playerId, position: 0, hidden: false })
    this.playedThisRound[playerId] = true
    this.saveState()
    const et = this.endTurn()
    return { ok: true, endTurn: et }
  }

  // Play a card from hand onto the board at a specific position (zone)
  playCardTo(playerId: number, handIndex: number, position: number) {
    if (playerId !== this.activePlayerId) return { ok: false, reason: 'not your turn' }
    if (this.playedThisRound[playerId]) return { ok: false, reason: 'already played this round' }
    const hand = this.hands[playerId] || []
    if (handIndex < 0 || handIndex >= hand.length) return { ok: false, reason: 'invalid hand index' }
    if (!Number.isFinite(position) || position < 0 || position >= ZONES.length) return { ok: false, reason: 'invalid position' }
    const card = hand.splice(handIndex, 1)[0]
    this.cardsInPlay.push({ id: uuid(), card, ownerId: playerId, position: position, hidden: false })
    this.playedThisRound[playerId] = true
    this.saveState()
    const et = this.endTurn()
    return { ok: true, endTurn: et }
  }

  // Move a specific card by up to `steps` positions (must be non-negative)
  moveCard(cardId: string, playerId: number, steps: number) {
    if (playerId !== this.activePlayerId) return { ok: false, reason: 'not your turn' }
    const g = this.cardsInPlay.find(c => c.id === cardId)
    if (!g) return { ok: false, reason: 'card not found' }
    if (g.ownerId !== playerId) return { ok: false, reason: 'not your card' }
    if (!Number.isFinite(steps) || steps < 0) return { ok: false, reason: 'invalid steps' }
    const maxSteps = g.card.velocity ?? 0
    if (steps > maxSteps) return { ok: false, reason: 'exceeds velocity' }
    const maxPos = ZONES.length - 1
    g.position = Math.min(maxPos, g.position + Math.trunc(steps))
    // trigger onMoved command if present
    try {
      const cmd = getCommandFor(g.card.title || '')
      if (cmd && cmd.onMoved) cmd.onMoved(this, g, playerId, steps)
    } catch (e) {
      // ignore command errors
    }
    this.saveState()
    const et = this.endTurn()
    return { ok: true, endTurn: et }
  }

  // Attack a target card with an attacker card (both must be in play)
  attackCard(attackerId: string, targetId: string, playerId: number) {
    if (playerId !== this.activePlayerId) return { ok: false, reason: 'not your turn' }
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
      // default damage
      target.card.hp = Math.max(0, target.card.hp - (attacker.card.attackPoints ?? 0))
    }
    // remove dead cards
    this.cardsInPlay = this.cardsInPlay.filter(g => g.card.hp > 0)
    this.saveState()
    const et = this.endTurn()
    return { ok: true, endTurn: et }
  }

  // Convert (steal) a target card into the attacker's ownership when attacker is a PRIEST
  convertCard(attackerId: string, targetId: string, playerId: number) {
    if (playerId !== this.activePlayerId) return { ok: false, reason: 'not your turn' }
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
    this.saveState()
    return { ok: true }
  }

  nextPhase() {
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
    if (!this.players || !this.players.length) return { ok: false, reason: 'no players' }
    this.activePlayerId = (this.activePlayerId + 1) % this.players.length
    if (this.activePlayerId === 0) {
      this.round = (this.round || 1) + 1
      this.playedThisRound = {}
    }
    this.saveState()
    return { ok: true, activePlayerId: this.activePlayerId, round: this.round }
  }

  // Persist internal state to localStorage (browser). Silent on failure.
  saveState() {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return false
      const payload = {
        deck: this.deck.map(d => d.toJSON()),
        players: this.players,
        cardsInPlay: this.cardsInPlay.map(g => ({ id: g.id, ownerId: g.ownerId, position: g.position, hidden: !!g.hidden, card: g.card.toJSON() })),
        hands: Object.fromEntries(Object.entries(this.hands || {}).map(([k, arr]) => [k, arr.map(c => c.toJSON())])),
        activePlayerId: this.activePlayerId,
        round: this.round,
        playedThisRound: this.playedThisRound || {}
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
      playedThisRound: this.playedThisRound || {}
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
      // hands: expose full cards only to active player; others get counts
      hands: Object.fromEntries(this.players.map(p => {
        const arr = this.hands[p.id] || []
        return [p.id, p.id === this.activePlayerId ? arr.map(c => c.toJSON()) : { count: arr.length }]
      }))
      ,
      playedThisRound: this.playedThisRound || {}
    }
  }
}
