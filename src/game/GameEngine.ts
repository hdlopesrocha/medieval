import Card from '../models/Card'
import { CardType } from '../models/Card'
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
    // apply damage
    target.card.hp = Math.max(0, target.card.hp - (attacker.card.attackPoints ?? 0))
    // remove dead cards
    this.cardsInPlay = this.cardsInPlay.filter(g => g.card.hp > 0)
    this.saveState()
    const et = this.endTurn()
    return { ok: true, endTurn: et }
  }

  // Convert (steal) a target card into the attacker's ownership when attacker is a PRIEST
  convertCard(attackerId: string, targetId: string, playerId: number) {
    if (playerId !== this.activePlayerId) return { ok: false, reason: 'not your turn' }
    const attacker = this.cardsInPlay.find(c => c.id === attackerId)
    const target = this.cardsInPlay.find(c => c.id === targetId)
    if (!attacker || !target) return { ok: false, reason: 'card not found' }
    if (attacker.ownerId !== playerId) return { ok: false, reason: 'not your attacker' }
    // only priests can convert
    if (attacker.card.type !== CardType.PRIEST) return { ok: false, reason: 'attacker is not a priest' }
    const dist = Math.abs(target.position - attacker.position)
    if (dist > (attacker.card.range ?? 0)) return { ok: false, reason: 'target out of range' }
    if (target.ownerId === playerId) return { ok: false, reason: 'target already yours' }

    // change ownership and move to owner's castle (position 0), reveal the card
    target.ownerId = playerId
    target.position = 0
    target.hidden = false
    this.saveState()
    return { ok: true }
  }

  // General purpose ability trigger for cards with special effects
  useCardAbility(cardId: string, playerId: number, targetId?: string) {
    const g = this.cardsInPlay.find(c => c.id === cardId)
    if (!g) return { ok: false, reason: 'card not found' }
    if (g.ownerId !== playerId) return { ok: false, reason: 'not your card' }

    const damageTarget = (tid: string, dmg: number, ignoreDefense = false) => {
      const t = this.cardsInPlay.find(x => x.id === tid)
      if (!t) return
      const actual = ignoreDefense ? dmg : Math.max(0, dmg - (t.card.defensePoints ?? 0))
      t.card.hp = Math.max(0, t.card.hp - actual)
    }

    const reviveToCastle = (owner: number) => {
      if (!this.deck.length) return false
      const c = this.deck.shift()!
      this.cardsInPlay.push({ id: uuid(), card: c, ownerId: owner, position: 0, hidden: false })
      return true
    }

    const findEnemies = () => this.cardsInPlay.filter(x => x.ownerId !== playerId)
    const findAllies = () => this.cardsInPlay.filter(x => x.ownerId === playerId)

    const title = g.card.title || ''
    switch (title) {
      case 'D. Afonso Henriques':
        // +2 attack vs enemy castle: if target is castle-positioned enemy, deal attack+2
        if (!targetId) return { ok: false, reason: 'no target' }
        const tgtA = this.cardsInPlay.find(x => x.id === targetId)
        if (!tgtA) return { ok: false, reason: 'target not found' }
        if (tgtA.position === ZONES.length - 1 && tgtA.ownerId !== playerId) {
          damageTarget(targetId, (g.card.attackPoints ?? 0) + 2)
        } else {
          damageTarget(targetId, (g.card.attackPoints ?? 0))
        }
        break

      case 'D. Dinis':
        // Heal 1 life to all units in Agriculture (assume zone index 2 for owner's farm)
        for (const a of findAllies().filter(x => x.position === 2)) a.card.hp = (a.card.hp || 0) + 1
        break

      case 'D. João I':
        // Soldiers +1 defense in Civilization (assume zone index 1)
        for (const a of findAllies().filter(x => x.position === 1 && x.card.type === CardType.SOLDIER)) a.card.defensePoints = (a.card.defensePoints || 0) + 1
        break

      case 'D. João II':
        // Remove 1 enemy unit (target)
        if (!targetId) return { ok: false, reason: 'no target' }
        this.cardsInPlay = this.cardsInPlay.filter(x => x.id !== targetId)
        break

      case 'D. Manuel I':
        // Play 1 extra card: clear playedThisRound so player can play again
        this.playedThisRound[playerId] = false
        break

      case 'D. Sebastião':
        // Cavalry +2 attack, lose 1 life (king loses 1 hp)
        for (const a of findAllies().filter(x => x.card.type === CardType.CAVALRY)) a.card.attackPoints = (a.card.attackPoints || 0) + 2
        g.card.hp = Math.max(0, (g.card.hp || 0) - 1)
        break

      case 'D. João IV':
        // Revive 1 allied unit: bring top deck card to castle
        reviveToCastle(playerId)
        break

      case 'D. Pedro I':
        // Drain 1 life from target
        if (!targetId) return { ok: false, reason: 'no target' }
        damageTarget(targetId, 1)
        g.card.hp = (g.card.hp || 0) + 1
        break

      case 'D. Afonso V':
        // Cavalry +1 movement
        for (const a of findAllies().filter(x => x.card.type === CardType.CAVALRY)) a.card.velocity = (a.card.velocity || 0) + 1
        break

      case 'D. João III':
        // Enemy priests lose effects: remove priests' special flags by reducing their attack/defense slightly
        for (const e of findEnemies().filter(x => x.card.type === CardType.PRIEST)) { e.card.attackPoints = Math.max(0, (e.card.attackPoints || 0) - 1); e.card.defensePoints = Math.max(0, (e.card.defensePoints || 0) - 1) }
        break

      case 'D. José I':
        // Remove all negative effects: heal allied units a bit
        for (const a of findAllies()) a.card.hp = (a.card.hp || 0) + 1
        break

      case 'D. João VI':
        // Move any allied unit: expects targetId and new position passed as targetId format "id:pos"
        if (!targetId) return { ok: false, reason: 'no target' }
        const parts = targetId.split(':')
        const moveId = parts[0]
        const pos = Number(parts[1])
        const mv = this.cardsInPlay.find(x => x.id === moveId && x.ownerId === playerId)
        if (!mv) return { ok: false, reason: 'ally not found' }
        if (!Number.isFinite(pos) || pos < 0 || pos >= ZONES.length) return { ok: false, reason: 'invalid position' }
        mv.position = pos
        break

      case 'D. Pedro IV':
        // Units attack immediately: make allied units damage nearby enemies by their attackPoints
        for (const a of findAllies()) {
          for (const e of findEnemies()) {
            const dist = Math.abs(e.position - a.position)
            if (dist <= (a.card.range || 0)) e.card.hp = Math.max(0, e.card.hp - (a.card.attackPoints || 0))
          }
        }
        break

      case 'D. Miguel I':
        // Enemy discards 1 card
        const oppId = this.players.find(p => p.id !== playerId)?.id
        if (oppId != null && this.hands[oppId] && this.hands[oppId].length) this.hands[oppId].splice(0, 1)
        break

      case 'D. Manuel II':
        // Protect 1 allied unit: bump defense
        if (!targetId) return { ok: false, reason: 'no target' }
        const prot = this.cardsInPlay.find(x => x.id === targetId && x.ownerId === playerId)
        if (!prot) return { ok: false, reason: 'ally not found' }
        prot.card.defensePoints = (prot.card.defensePoints || 0) + 2
        break

      case 'Santo António de Lisboa':
        // Search any card: reveal top of deck into player's hand
        if (this.deck.length) this.hands[playerId].push(this.deck.shift()!)
        break

      case 'Santa Isabel de Portugal':
        // Heal 3 Life to all allied units
        for (const a of findAllies()) a.card.hp = (a.card.hp || 0) + 3
        break

      case 'São João de Deus':
      case 'Santa Rita de Cássia':
        // Revive 1 unit: bring top deck card to castle
        reviveToCastle(playerId)
        break

      case 'São Nuno de Santa Maria':
        // Cavalry +2 Attack & +1 Defense
        for (const a of findAllies().filter(x => x.card.type === CardType.CAVALRY)) { a.card.attackPoints = (a.card.attackPoints || 0) + 2; a.card.defensePoints = (a.card.defensePoints || 0) + 1 }
        break

      case 'São Vicente':
        // Castle +3 Health -> heal allied units in castle (pos 0)
        for (const a of findAllies().filter(x => x.position === 0)) a.card.hp = (a.card.hp || 0) + 3
        break

      case 'São Francisco Xavier':
        // Convert 1 adjacent enemy (acts like priest convert): needs targetId
        if (!targetId) return { ok: false, reason: 'no target' }
        return this.convertCard(cardId, targetId, playerId)

      case 'São Gonçalo de Amarante':
        // 2 units share life: pick two allied units nearby; if targetId provided as "id1:id2" split and average
        if (!targetId) return { ok: false, reason: 'no target' }
        const ids = targetId.split(':')
        if (ids.length < 2) return { ok: false, reason: 'need two targets' }
        const a1 = this.cardsInPlay.find(x => x.id === ids[0] && x.ownerId === playerId)
        const a2 = this.cardsInPlay.find(x => x.id === ids[1] && x.ownerId === playerId)
        if (!a1 || !a2) return { ok: false, reason: 'allies not found' }
        const avg = Math.floor(((a1.card.hp || 0) + (a2.card.hp || 0)) / 2)
        a1.card.hp = avg; a2.card.hp = avg
        break

      case 'Santa Joana Princesa':
        // Sacrifice to save: set own HP to 0 and give +3 hp to target ally
        if (!targetId) return { ok: false, reason: 'no target' }
        const sacr = this.cardsInPlay.find(x => x.id === cardId)
        const ally = this.cardsInPlay.find(x => x.id === targetId && x.ownerId === playerId)
        if (!sacr || !ally) return { ok: false, reason: 'invalid targets' }
        sacr.card.hp = 0
        ally.card.hp = (ally.card.hp || 0) + 3
        this.cardsInPlay = this.cardsInPlay.filter(x => x.card.hp > 0)
        break

      case 'São Roque':
        // Units immune 1 turn: set defense very high (simple approximation)
        for (const a of findAllies()) a.card.defensePoints = (a.card.defensePoints || 0) + 99
        break

      case 'São Teotónio':
        // Generate 1 Soldier: create a basic soldier and place in castle
        this.cardsInPlay.push({ id: uuid(), card: new Card('', 'Generated Soldier', 'Summoned soldier', '', 2, 1, CardType.SOLDIER, 3, 2, 1), ownerId: playerId, position: 0, hidden: false })
        break

      case 'São José':
        // Shield a unit: increase defense
        if (!targetId) return { ok: false, reason: 'no target' }
        const sh = this.cardsInPlay.find(x => x.id === targetId && x.ownerId === playerId)
        if (!sh) return { ok: false, reason: 'ally not found' }
        sh.card.defensePoints = (sh.card.defensePoints || 0) + 2
        break

      case 'Santa Luzia':
        // Reveal & discard: reveal enemy hand (no UI here) and discard first card if exists
        const opp = this.players.find(p => p.id !== playerId)?.id
        if (opp != null && this.hands[opp] && this.hands[opp].length) this.hands[opp].splice(0, 1)
        break

      case 'São Bento':
        // Remove 1 enemy unit: expects targetId
        if (!targetId) return { ok: false, reason: 'no target' }
        this.cardsInPlay = this.cardsInPlay.filter(x => x.id !== targetId)
        break

      case 'Nossa Senhora de Fátima':
        // Heal all & stop attacks: heal allies and set a simple flag skipAttacks for next phase
        for (const a of findAllies()) a.card.hp = (a.card.hp || 0) + 3
        ;(this as any)._skipEnemyAttacks = true
        break

      // Soldiers/Cavalry/Catapults/Ships/Archangels/priests effects
      case 'Line Soldier':
      case 'Siege Soldier':
      case 'Devoted Soldier':
        // Protect or heal if near saint (Devoted Soldier special)
        if (title === 'Devoted Soldier') {
          const hasSaint = findAllies().some(x => x.card.type === CardType.SAINT)
          if (hasSaint) g.card.hp = (g.card.hp || 0) + 1
        }
        break

      case 'Shock Cavalry':
        // Move & attack: if targetId provided, perform simple attack
        if (targetId) {
          const t = this.cardsInPlay.find(x => x.id === targetId)
          if (t) { t.card.hp = Math.max(0, t.card.hp - (g.card.attackPoints || 0)) }
        }
        break

      case 'Guard Cavalry':
        // Block first attack: give high defense
        g.card.defensePoints = (g.card.defensePoints || 0) + 2
        break

      case 'Wandering Cavalry':
        // Heal or damage: pick targetId and heal if ally else damage
        if (!targetId) return { ok: false, reason: 'no target' }
        const tg = this.cardsInPlay.find(x => x.id === targetId)
        if (!tg) return { ok: false, reason: 'target not found' }
        if (tg.ownerId === playerId) tg.card.hp = (tg.card.hp || 0) + 1
        else tg.card.hp = Math.max(0, (tg.card.hp || 0) - (g.card.attackPoints || 0))
        break

      case 'Siege Catapult':
        // +4 vs castle: if target is castle, heavy damage
        if (!targetId) return { ok: false, reason: 'no target' }
        const ct = this.cardsInPlay.find(x => x.id === targetId)
        if (!ct) return { ok: false, reason: 'target not found' }
        if (ct.position === ZONES.length - 1) damageTarget(targetId, (g.card.attackPoints || 0) + 4)
        else damageTarget(targetId, g.card.attackPoints || 0)
        break

      case 'Fire Catapult':
        // Area damage: damage all enemies within 1 tile
        for (const e of findEnemies()) {
          if (Math.abs(e.position - g.position) <= 1) e.card.hp = Math.max(0, e.card.hp - (g.card.attackPoints || 0))
        }
        break

      case 'Destruction Catapult':
        // Remove shields: reduce defense of enemies in range
        for (const e of findEnemies()) if (Math.abs(e.position - g.position) <= (g.card.range || 0)) e.card.defensePoints = Math.max(0, (e.card.defensePoints || 0) - 2)
        break

      case 'Transport Ship':
        // Move land unit: expects targetId format "id:pos"
        if (!targetId) return { ok: false, reason: 'no target' }
        const pparts = targetId.split(':')
        const moveUnitId = pparts[0]
        const newPos = Number(pparts[1])
        const mu = this.cardsInPlay.find(x => x.id === moveUnitId)
        if (!mu) return { ok: false, reason: 'unit not found' }
        mu.position = newPos
        break

      case 'Assault Ship':
        // 2 damage castle: apply 2 to target
        if (!targetId) return { ok: false, reason: 'no target' }
        damageTarget(targetId, 2)
        break

      case 'Strategic Caravel':
        // Move any unit: same as Transport but for any unit
        if (!targetId) return { ok: false, reason: 'no target' }
        const p2 = targetId.split(':')
        const uid = p2[0]
        const np = Number(p2[1])
        const uu = this.cardsInPlay.find(x => x.id === uid)
        if (!uu) return { ok: false, reason: 'unit not found' }
        uu.position = np
        break

      case 'Healing Priest':
        // Heal 2 Life adjacent: target required
        if (!targetId) return { ok: false, reason: 'no target' }
        const ht = this.cardsInPlay.find(x => x.id === targetId && x.ownerId === playerId)
        if (!ht) return { ok: false, reason: 'ally not found' }
        ht.card.hp = (ht.card.hp || 0) + 2
        break

      case 'Inquisitor Priest':
        // Negate effects on target: reduce attack/defense
        if (!targetId) return { ok: false, reason: 'no target' }
        const it = this.cardsInPlay.find(x => x.id === targetId && x.ownerId !== playerId)
        if (!it) return { ok: false, reason: 'enemy not found' }
        it.card.attackPoints = Math.max(0, (it.card.attackPoints || 0) - 1)
        it.card.defensePoints = Math.max(0, (it.card.defensePoints || 0) - 1)
        break

      case 'Guardian Archangel':
        // Protect adjacent: increase defense of adjacent allies
        for (const a of findAllies()) if (Math.abs(a.position - g.position) <= 1) a.card.defensePoints = (a.card.defensePoints || 0) + 2
        break

      case 'Wrath Archangel':
        // Ignore defense: deal direct damage to target
        if (!targetId) return { ok: false, reason: 'no target' }
        damageTarget(targetId, (g.card.attackPoints || 0), true)
        break

      case 'Miracle':
        // Full restore: restore allied hp to 10
        for (const a of findAllies()) a.card.hp = 10
        break

      case 'Total Siege':
        // All siege engines attack twice on enemy castle
        for (const s of findAllies().filter(x => x.card.type === CardType.CATAPULT)) {
          const enemiesInCastle = this.cardsInPlay.filter(x => x.position === ZONES.length - 1 && x.ownerId !== playerId)
          for (const ec of enemiesInCastle) ec.card.hp = Math.max(0, ec.card.hp - (s.card.attackPoints || 0) * 2)
        }
        break

      case 'Forced March':
        // Units move +1
        for (const a of findAllies()) a.card.velocity = (a.card.velocity || 0) + 1
        break

      case 'Betrayal':
        // Control 1 enemy: change owner of target
        if (!targetId) return { ok: false, reason: 'no target' }
        const betray = this.cardsInPlay.find(x => x.id === targetId && x.ownerId !== playerId)
        if (!betray) return { ok: false, reason: 'enemy not found' }
        betray.ownerId = playerId
        break

      default:
        return { ok: false, reason: 'ability not implemented' }
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
