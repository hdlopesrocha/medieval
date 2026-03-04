import Card from '../models/Card'
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


function uuid() {
  return Math.random().toString(36).slice(2, 9)
}

export default class GameEngine {
  ZONES = ZONES
  // Persistence: deck, players, cardsInPlay and hands are persisted in `gameContext`.
  gameContext: GameContext = new GameContext()
  gameWorkflow: GameWorkflowState = new GameWorkflowState()
  // Map of card UUID -> Card instance. Hands are persisted as UUID arrays in gameContext and resolved via this map.
  cardsById: Record<string, Card> = {}
  // Internal flag to skip automatic enemy attacks for the next phase
  private _skipEnemyAttacks = false

  // Deck accessors backed by gameContext (serialize/deserialize)
  get deck(): Card[] {
    const raw = (this.gameContext.getDeck ? this.gameContext.getDeck() : (this.gameContext.deck || [])) || []
    // If persisted as uuids (string array), resolve via cardsById
    if (raw.length && typeof raw[0] === 'string') {
      return (raw as string[]).map(id => this.cardsById[id]).filter(Boolean)
    }
    // legacy: array of card JSON objects -> convert, register and persist uuids
    const out: Card[] = []
    const idsForPersist: string[] = []
    let converted = false
    for (const item of raw) {
      if (!item) continue
      try {
        const c = Card.fromJSON(item)
        const id = this.registerCard(c)
        out.push(c)
        idsForPersist.push(id)
        converted = true
      } catch (e) {
        // ignore
      }
    }
    if (converted) {
      try { this.gameContext.setDeck(idsForPersist as any) } catch (e) {}
    }
    return out
  }
  set deck(cards: Card[]) {
    try {
      const ids: string[] = []
      for (const c of (cards || [])) {
        if (!c) continue
        const id = this.registerCard(c)
        ids.push(id)
      }
      this.gameContext.setDeck(ids as any)
    } catch (e) {}
  }

  // Players list persisted in gameContext.playersList
  get players(): Player[] {
    return (this.gameContext.getPlayersList ? this.gameContext.getPlayersList() : (this.gameContext.playersList || [])).map((p: any) => ({ id: Number(p.id || 0), name: p.name }))
  }
  set players(pl: Player[]) {
    try { this.gameContext.setPlayersList(pl || []) } catch (e) {}
  }

  // Cards in play persisted in gameContext.cardsInPlay (card as JSON)
  get cardsInPlay(): GameCard[] {
    return (this.gameContext.getCardsInPlay ? this.gameContext.getCardsInPlay() : (this.gameContext.cardsInPlay || [])).map((g: any) => ({ id: g.id, ownerId: Number(g.ownerId || 0), position: Number(g.position || 0), hidden: !!g.hidden, card: Card.fromJSON(g.card) }))
  }
  set cardsInPlay(arr: GameCard[]) {
    try {
      this.gameContext.setCardsInPlay((arr || []).map(g => ({ id: g.id, ownerId: g.ownerId, position: g.position, hidden: !!g.hidden, card: (g.card && typeof (g.card as any).toJSON === 'function') ? (g.card as any).toJSON() : g.card })))
    } catch (e) {}
  }

  // Hands mapped to gameContext.players (per-player hands stored as JSON)
  get hands(): { [p: number]: Card[] } {
    const out: { [p: number]: Card[] } = {}
    const players = this.gameContext.getPlayersList ? this.gameContext.getPlayersList() : (this.gameContext.playersList || [])
    for (const p of (players || [])) {
      const id = Number(p.id || 0)
      out[id] = this.getPlayerCards(id)
    }
    return out
  }
  set hands(map: { [p: number]: Card[] }) {
    try {
      const payload: Record<string, any[]> = {}
      for (const k of Object.keys(map || {})) {
        const arr = (map[Number(k)] || [])
        const ids: string[] = []
        for (const c of arr) {
          if (!c) continue
          // ensure card is registered and get its uuid
          const cid = this.registerCard(c)
          ids.push(cid)
        }
        payload[k] = ids
      }
      this.gameContext.setAllPlayerCards(payload)
    } catch (e) {}
  }

  // Register a card in the local map and return its uuid. If card is already registered by reference, we still create a new id.
  registerCard(card: Card): string {
    const id = uuid()
    try { this.cardsById[id] = card } catch (e) {}
    return id
  }

  // Resolve persisted player hand (UUIDs or legacy objects) into Card[]; register legacy objects into cardsById and persist uuids back into context.
  getPlayerCards(playerId: number): Card[] {
    const raw = (this.gameContext.getPlayerCards ? this.gameContext.getPlayerCards(playerId) : []) || []
    const out: Card[] = []
    let converted = false
    const idsForPersist: string[] = []
    for (const item of raw) {
      if (typeof item === 'string') {
        const c = this.cardsById[item]
        if (c) {
          out.push(c)
          idsForPersist.push(item)
        } else {
          // unknown uuid: ignore (could be from another machine) but keep uuid so persisted state remains consistent
          idsForPersist.push(item)
        }
      } else if (item && typeof item === 'object') {
        // legacy card JSON -> convert and register
        try {
          const card = Card.fromJSON(item)
          const id = this.registerCard(card)
          out.push(card)
          idsForPersist.push(id)
          converted = true
        } catch (e) {
          // ignore invalid entries
        }
      }
    }
    // If we converted legacy objects into uuids, persist the normalized uuid list into gameContext
    if (converted) {
      try { this.gameContext.setPlayerCards(playerId, idsForPersist) } catch (e) {}
    }
    return out
  }

  // Public ability: use a card's special ability (invoked via views)
  // (signature overload placed next to implementation to expose in type surface)

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
      playerId: this.gameContext.playerId,
      round: this.gameWorkflow.round,
      actionByPlayer: this.gameWorkflow.actionByPlayer || {},
      gameOver: this.gameWorkflow.gameOver,
      loserPlayerId: this.gameWorkflow.loserPlayerId,
      winnerPlayerId: this.gameWorkflow.winnerPlayerId
    };
    // Use workflow object as needed, e.g. this.gameContext.setWorkflow(workflow)
  }

  constructor() {
    this.deck = [...deckService.createDeck()]
    this.gameContext = new GameContext()
    this.gameContext.setDeck(this.deck)
    // attempt to restore persisted state (if running in browser)
    try {
      const restored = this.loadState()
      if (!restored) {
        // persist initial deck so randomized HP is kept
        this.createGameState()
        this.saveState('init')
      }
      this.syncGameStateService()
    } catch (e) {
      // ignore storage errors
      this.syncGameStateService()
    }
  }


  createGameState() {
    const wf = new GameWorkflowState()
    wf.appendHistory({ action: 'createGameState', activePlayerId: 0, round: 0, gameOver: false, deckCount: (this.deck || []).length, cardsInPlayCount: (this.cardsInPlay || []).length, castleHpByPlayer: this.gameContext.castleHpByPlayer || {} })
    this.gameWorkflow = wf

    // Determine local player name from available localStorage keys when running in browser.
    let localName = 'Player 0'
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localName = window.localStorage.getItem('localName') || window.localStorage.getItem('playerName') || window.localStorage.getItem('name') || localName
      }
    } catch (e) {
      // ignore
    }
    this.startGame([String(localName || 'Player 0'), 'Client'])
    this.saveState('createGameState')
    return wf
  }

  // revive top of deck into owner's castle
  reviveTopToCastle(owner: number) {
    const deckArr = this.deck
    if (!deckArr.length) return false
    const c = deckArr.shift()!
    this.deck = deckArr
    const cip = this.cardsInPlay
    cip.push({ id: uuid(), card: c, ownerId: owner, position: this.getSpawnZone(c, owner), hidden: false })
    this.cardsInPlay = cip
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
    const played = this.normalizePlayedThisRound(this.gameWorkflow.actionByPlayer)
    if (Boolean(played[p])) return { ok: false, reason: 'already played this round' }
    return { ok: true }
  }

  recordActionAndEndTurn(p: number, action = 'turnAction') {
    // mark action taken in workflow.actionByPlayer
    try { this.gameWorkflow.actionByPlayer = this.gameWorkflow.actionByPlayer || {} } catch (e) {}
    this.gameWorkflow.actionByPlayer[String(p)] = 'action-taken'
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
    const deckArr = this.deck
    for (let i = deckArr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const tmp = deckArr[i]
      deckArr[i] = deckArr[j]
      deckArr[j] = tmp
    }
    this.deck = deckArr
    this.saveState('shuffleDeck')
  }

  startGame(playerNames: string[] = ['Server', 'Client']) {
    // reset players and create a fresh deck from the sample deck
    this.players = playerNames.map((n, i) => ({ id: i, name: n }))
    // create a fresh randomized deck
    this.deck = deckService.createDeck()
    // shuffle the deck so order is randomized at game start
    this.shuffleDeck()
    // use the (possibly shuffled) deck from the accessor
    const remainingDeck = this.deck
    // reset cards in play and deal hands into a local persisted structure
    this.cardsInPlay = []
    const handsLocal: Record<string, any[]> = {}
    for (let i = 0; i < this.players.length; i++) handsLocal[String(i)] = []
    for (let p = 0; p < this.players.length; p++) {
      for (let k = 0; k < 5 && remainingDeck.length; k++) {
        const card = remainingDeck.shift()!
        // register the card and persist its uuid in the player's hand
        const cid = this.registerCard(card)
        handsLocal[String(p)].push(cid)
      }
    }
    // Ensure both player slots exist (0 = server, 1 = client)
    if (!Object.prototype.hasOwnProperty.call(handsLocal, '0')) handsLocal['0'] = []
    if (!Object.prototype.hasOwnProperty.call(handsLocal, '1')) handsLocal['1'] = []
    // Persist player hands and remaining deck
    this.gameContext.setAllPlayerCards(handsLocal)
    this.deck = remainingDeck
    // market phase removed
    this.gameWorkflow = new GameWorkflowState()
    this.saveState('startGame')
  }

  // market and buy mechanics removed

  // Play a card from hand onto the board (position 0). Reveals the card.
  playCard(p: number, handIndex: number) {
    const can = this.canAct(p)
    if (!can.ok) return can
    const handsMap = this.hands
    const hand = handsMap[p] || []
    if (handIndex < 0 || handIndex >= hand.length) return { ok: false, reason: 'invalid hand index' }
    const card = hand.splice(handIndex, 1)[0]
    handsMap[p] = hand
    this.hands = handsMap
    const cip = this.cardsInPlay
    cip.push({ id: uuid(), card, ownerId: p, position: this.getSpawnZone(card, p), hidden: false })
    this.cardsInPlay = cip
    return this.recordActionAndEndTurn(p, 'playCard')
  }

  // Play a card from hand onto the board at a specific position (zone)
  playCardTo(p: number, handIndex: number, position: number) {
    const can = this.canAct(p)
    if (!can.ok) return can
    const handsMap = this.hands
    const hand = handsMap[p] || []
    if (handIndex < 0 || handIndex >= hand.length) 
      return { ok: false, reason: 'invalid hand index' }
    if (!Number.isFinite(position) || position < 0 || position >= ZONES.length) return { ok: false, reason: 'invalid position' }
    const spawn = this.getSpawnZone(hand[handIndex], p)
    if (position !== spawn) return { ok: false, reason: 'cards must be played in zone 0' }
    const card = hand.splice(handIndex, 1)[0]
    handsMap[p] = hand
    this.hands = handsMap
    const cip = this.cardsInPlay
    cip.push({ id: uuid(), card, ownerId: p, position: this.getSpawnZone(card, p), hidden: false })
    this.cardsInPlay = cip
    return this.recordActionAndEndTurn(p, 'playCardTo')
  }

  // Move a specific card by up to `steps` positions (must be non-negative)
  moveCard(cardId: string, p: number, steps: number) {
    const can = this.canAct(p)
    if (!can.ok) return can
    const cip = this.cardsInPlay
    const g = cip.find(c => c.id === cardId)
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
    // persist updated positions
    this.cardsInPlay = cip
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

  // Use a card's special ability (invokes command.onPlayed)
  useCardAbility(cardId: string, p: number, targetId?: string) {
    const can = this.canAct(p)
    if (!can.ok) return can
    const g = this.cardsInPlay.find(c => c.id === cardId)
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
    return this.recordActionAndEndTurn(p, 'useCardAbility')
  }

  // Public: set whether automatic enemy attacks should be skipped for the next phase
  setSkipEnemyAttacks(value: boolean) {
    this._skipEnemyAttacks = !!value
  }

  nextPhase() {
    if (this.gameWorkflow.gameOver) return
    // Enemy automatic movement: move only non-player cards (ownerId !== 0)
    const maxPos = ZONES.length - 1
    for (const g of this.cardsInPlay.filter(c => c.ownerId !== 0)) {
      const newPos = Math.min(maxPos, g.position + Math.max(0, g.card.velocity))
      g.position = newPos
    }

    // Enemy automatic attacks: enemy cards attack player cards within range
    if (this._skipEnemyAttacks) {
      // consume the flag and skip enemy attacks for this phase
      this._skipEnemyAttacks = false
    } else {
      for (const attacker of [...this.cardsInPlay].filter(c => c.ownerId !== 0)) {
        const enemies = this.cardsInPlay.filter(e => e.ownerId === 0)
        for (const enemy of enemies) {
          const dist = Math.abs(enemy.position - attacker.position)
          if (dist <= (attacker.card.range ?? 0)) {
            enemy.card.hp = Math.max(0, enemy.card.hp - (attacker.card.attackPoints ?? 0))
          }
        }
      }
    }

    // remove dead cards
    this.cardsInPlay = this.cardsInPlay.filter(g => g.card.hp > 0)
    this.saveState('nextPhase')
  }

  // Advance active player (end current player's turn)
  endTurn() {
    if (this.gameWorkflow.gameOver) {
      this.saveState('endTurn')
      return { ok: true, activePlayerId: this.gameWorkflow.activePlayerId, playerId: this.gameContext.playerId, round: this.gameWorkflow.round, gameOver: true, winnerPlayerId: this.gameWorkflow.winnerPlayerId, loserPlayerId: this.gameWorkflow.loserPlayerId }
    }
    const previousPlayerId = this.gameWorkflow.activePlayerId
    this.applyCastleDamageFromOwner(previousPlayerId)
    if (this.gameWorkflow.gameOver) {
      this.saveState('endTurn')
      return { ok: true, activePlayerId: this.gameWorkflow.activePlayerId, playerId: this.gameContext.playerId, round: this.gameWorkflow.round, gameOver: true, winnerPlayerId: this.gameWorkflow.winnerPlayerId, loserPlayerId: this.gameWorkflow.loserPlayerId }
    }
    if (!this.players || !this.players.length) return { ok: false, reason: 'no players' }
    this.gameWorkflow.activePlayerId = (this.gameWorkflow.activePlayerId + 1) % this.players.length
    this.gameContext.playerId = this.gameWorkflow.activePlayerId
    // clear played flag for the new active player
    try { this.gameWorkflow.actionByPlayer = this.gameWorkflow.actionByPlayer || {} } catch (e) {}
    this.gameWorkflow.actionByPlayer[String(this.gameWorkflow.activePlayerId)] = ''
    if (this.gameWorkflow.activePlayerId === 0) {
      this.gameWorkflow.round = (Number.isFinite(this.gameWorkflow.round) ? this.gameWorkflow.round : 0) + 1
      this.gameWorkflow.actionByPlayer = {}
    }
    this.saveState('endTurn')
    return { ok: true, activePlayerId: this.gameWorkflow.activePlayerId, playerId: this.gameContext.playerId, round: this.gameWorkflow.round, gameOver: false }
  }

  // Persist internal state to localStorage (browser). Silent on failure.
  saveState(action = 'stateUpdate') {
    this.syncGameStateService()
    try {
      // build hands payload (playerId -> array of uuid strings) using persisted player hands in gameContext
      const handsPayload: Record<string, string[]> = {}
      try {
        const playersList = this.gameContext.getPlayersList ? this.gameContext.getPlayersList() : (this.gameContext.playersList || [])
        for (const p of (playersList || [])) {
          const pid = Number(p.id || 0)
          try {
            const uuids = this.gameContext.getPlayerCards ? this.gameContext.getPlayerCards(pid) : (p.hand || [])
            handsPayload[String(pid)] = Array.isArray(uuids) ? uuids.map(String) : []
          } catch (e) {
            handsPayload[String(pid)] = []
          }
        }
      } catch (e) {
        // fallback: derive from runtime hands by registering cards
        for (const playerId of Object.keys(this.hands || {})) {
          const arr = (this.hands[Number(playerId)] || [])
          const ids: string[] = []
          for (const c of arr) if (c) ids.push(this.registerCard(c))
          handsPayload[playerId] = ids
        }
      }
      // build cards map (uuid -> card JSON) for persisted resolution
      const cardsMap: Record<string, any> = {}
      for (const id of Object.keys(this.cardsById || {})) {
        const c = this.cardsById[id]
        if (c && typeof c.toJSON === 'function') cardsMap[id] = c.toJSON()
      }

      // Persist deck as array of uuids; ensure cardsById contains all referenced cards
      let deckIds: any[] = (this.gameContext.getDeck ? this.gameContext.getDeck() : this.gameContext.deck) || []
      if (deckIds.length && typeof deckIds[0] !== 'string') {
        // legacy deck objects -> register and normalize
        const ids: string[] = []
        for (const item of deckIds) {
          try {
            const c = Card.fromJSON(item)
            const id = this.registerCard(c)
            ids.push(id)
          } catch (e) {}
        }
        try { this.gameContext.setDeck(ids as any) } catch (e) {}
        deckIds = ids
      }

      const gameToSave: any = {
        deck: (deckIds || []).map((d: any) => String(d)).filter(Boolean),
        players: this.players || [],
        cardsInPlay: (this.cardsInPlay || []).map(g => ({ id: g.id, ownerId: g.ownerId, position: g.position, hidden: !!g.hidden, card: g.card ? g.card.toJSON() : null })).filter(Boolean),
        hands: handsPayload,
        cardsById: cardsMap,
        playerId: this.gameContext.playerId,
        round: this.gameWorkflow.round,
        actionByPlayer: this.gameWorkflow.actionByPlayer || {},
        castleHpByPlayer: this.gameContext.castleHpByPlayer || {},
        castleMaxHp: this.gameContext.castleMaxHp || {}
      }

      gameStateService.saveWorkflowState(this.gameWorkflow)
      gameStateService.saveGameState(gameToSave)

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
      // Deck may be persisted as uuids (new shape) or as legacy card JSONs
      if (obj.cardsById && typeof obj.cardsById === 'object') {
        try {
          for (const id of Object.keys(obj.cardsById)) {
            const json = obj.cardsById[id]
            if (json) this.cardsById[id] = Card.fromJSON(json)
          }
        } catch (e) {}
      }

      if (Array.isArray(obj.deck) && obj.deck.length && typeof obj.deck[0] === 'string') {
        // deck is array of uuids
        this.deck = (obj.deck as string[]).map(id => this.cardsById[id]).filter(Boolean)
      } else {
        // legacy: deck contains card JSON objects
        const converted: Card[] = []
        const idsForPersist: string[] = []
        for (const item of (obj.deck || [])) {
          try {
            const c = Card.fromJSON(item)
            const id = this.registerCard(c)
            converted.push(c)
            idsForPersist.push(id)
          } catch (e) {}
        }
        if (idsForPersist.length) {
          try { this.gameContext.setDeck(idsForPersist as any) } catch (e) {}
        }
        this.deck = converted
      }
      this.players = obj.players || []
      this.cardsInPlay = (obj.cardsInPlay || []).map((g: any) => ({ id: g.id, ownerId: g.ownerId, position: g.position, hidden: !!g.hidden, card: Card.fromJSON(g.card) }))

      // restore hands: support both legacy (arrays of card JSON) and new (arrays of uuid strings)
      const rawHands = obj.hands || {}
      // if entries are objects (legacy), convert and register them; if strings, assume uuids and persist directly
      const idsPayload: Record<string, string[]> = {}
      const handsMapRuntime: { [p: number]: Card[] } = {}
      for (const k of Object.keys(rawHands)) {
        const arr = rawHands[k] || []
        if (!arr.length) {
          idsPayload[k] = []
          handsMapRuntime[Number(k)] = []
          continue
        }
        if (typeof arr[0] === 'string') {
          // array of uuids
          idsPayload[k] = arr.map(String)
          handsMapRuntime[Number(k)] = (arr as string[]).map(id => this.cardsById[id]).filter(Boolean)
        } else {
          // legacy: array of card JSON
          const ids: string[] = []
          const cardsRuntime: Card[] = []
          for (const item of arr) {
            try {
              const card = Card.fromJSON(item)
              const id = this.registerCard(card)
              ids.push(id)
              cardsRuntime.push(card)
            } catch (e) {
              // ignore invalid
            }
          }
          idsPayload[k] = ids
          handsMapRuntime[Number(k)] = cardsRuntime
        }
      }
      // persist normalized uuid lists into gameContext so subsequent consumers read uuids
      try { this.gameContext.setAllPlayerCards(idsPayload) } catch (e) {}
      // set runtime hands from resolved cards
      this.hands = handsMapRuntime

      // workflow & gameplay metadata
      this.gameContext.playerId = Number(obj.playerId ?? this.gameContext.playerId)
      this.gameWorkflow.round = obj.round ?? this.gameWorkflow.round
      // reconcile played/action flags into workflow.actionByPlayer
      if (obj.actionByPlayer && typeof obj.actionByPlayer === 'object') {
        this.gameWorkflow.actionByPlayer = obj.actionByPlayer
      } else {
        const fromPlayed = Object.fromEntries(Object.keys(obj.playedThisRound || {}).map((k) => [k, (obj.playedThisRound || {})[k] ? 'action-taken' : '']))
        this.gameWorkflow.actionByPlayer = fromPlayed
      }

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
      // rebuild cardsById map if present on imported object
      if (obj.cardsById && typeof obj.cardsById === 'object') {
        try {
          for (const id of Object.keys(obj.cardsById)) {
            const json = obj.cardsById[id]
            if (json) this.cardsById[id] = Card.fromJSON(json)
          }
        } catch (e) {}
      }

      // Deck may be array of uuids or legacy card JSONs
      if (Array.isArray(obj.deck) && obj.deck.length && typeof obj.deck[0] === 'string') {
        this.deck = (obj.deck as string[]).map(id => this.cardsById[id]).filter(Boolean)
      } else {
        const converted: Card[] = []
        const idsForPersist: string[] = []
        for (const item of (obj.deck || [])) {
          try {
            const c = Card.fromJSON(item)
            const id = this.registerCard(c)
            converted.push(c)
            idsForPersist.push(id)
          } catch (e) {}
        }
        if (idsForPersist.length) {
          try { this.gameContext.setDeck(idsForPersist as any) } catch (e) {}
        }
        this.deck = converted
      }
      this.players = obj.players || []
      this.cardsInPlay = (obj.cardsInPlay || []).map((g: any) => ({ id: g.id, ownerId: g.ownerId, position: g.position, hidden: !!g.hidden, card: Card.fromJSON(g.card) }))
      const rawHands = obj.hands || {}
      const idsPayload2: Record<string, string[]> = {}
      const handsMap2: { [p: number]: Card[] } = {}
      for (const k of Object.keys(rawHands)) {
        const arr = rawHands[k] || []
        if (!arr.length) {
          idsPayload2[k] = []
          handsMap2[Number(k)] = []
          continue
        }
        if (typeof arr[0] === 'string') {
          idsPayload2[k] = arr.map(String)
          handsMap2[Number(k)] = (arr as string[]).map(id => this.cardsById[id]).filter(Boolean)
        } else {
          const ids: string[] = []
          const cardsRuntime: Card[] = []
          for (const item of arr) {
            try {
              const card = Card.fromJSON(item)
              const id = this.registerCard(card)
              ids.push(id)
              cardsRuntime.push(card)
            } catch (e) {}
          }
          idsPayload2[k] = ids
          handsMap2[Number(k)] = cardsRuntime
        }
      }
      this.hands = handsMap2
      this.gameContext = new GameContext(obj.castleHpByPlayer || this.gameContext.castleHpByPlayer)
      // ensure persisted hands exist (store uuid arrays)
      const handsPayload2: Record<string, string[]> = {}
      for (const k of Object.keys(handsMap2)) {
        handsPayload2[k] = (handsMap2[Number(k)] || []).map(c => this.registerCard(c))
      }
      if (!Object.prototype.hasOwnProperty.call(handsPayload2, '0')) handsPayload2['0'] = []
      if (!Object.prototype.hasOwnProperty.call(handsPayload2, '1')) handsPayload2['1'] = []
      this.gameContext.setAllPlayerCards(handsPayload2)
      this.gameWorkflow = new GameWorkflowState(obj.workflow || {})
      // import stored playerId into gameContext (favor explicit obj.playerId, fall back to workflow.playerId)
      this.gameContext.playerId = Number(obj.playerId ?? (obj.workflow && obj.workflow.playerId) ?? this.gameContext.playerId)
      this.saveState('importState')
      return { ok: true }
    } catch (e) {
      return { ok: false, reason: String(e) }
    }
  }
}
