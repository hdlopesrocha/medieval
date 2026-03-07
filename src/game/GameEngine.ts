import Card from '../models/Card'
import { DefaultCardHandler } from './CardHandler'
import { Player } from '../models/Player'
import { getCommandFor } from './commands/registry'
// import GameContext from '../models/GameContext' if needed
import deckService from '../services/deckService'
import gameStateService from '../services/gameStateService'
import { GameWorkflowState, GameWorkflowStateStorage } from '../models/GameWorkflowState'
import { GameContext, GameContextStorage } from '../models/GameContext'
import { Deck } from '../models/Deck'
import eventService from '../services/eventService'
import engine from './engineInstance'
import { ref } from 'vue'


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
  // Persistence: deck, players, cards and hands are persisted in `gameContext`.
  allCards: Deck = new Deck()
  gameContext: GameContext = null as any
  gameWorkflow: GameWorkflowState = null as any
  

  // runtime registries expected by UI and engine callers
  // Simple observer set so UI/pages can subscribe to engine state updates
  private _listeners: Set<(engine: GameEngine) => void> = new Set()

  onStateChange(cb: (engine: GameEngine) => void) {
    this._listeners.add(cb)
    return () => { this._listeners.delete(cb) }
  }

  offStateChange(cb: (engine: GameEngine) => void) {
    this._listeners.delete(cb)
  }

  private emitStateChange() {
    try {
      for (const cb of Array.from(this._listeners)) {
        try { cb(this) } catch (_e) { /* ignore listener errors */ }
      }
    } catch (_e) {}
  }
  // runtime registries expected by UI and engine callers
  // runtime registries expected by UI and engine callers

  // Expose players list (persisted entries) as a convenience
  get players(): Player[] {
    return this.gameContext?.playersList || []
  }

  // Return card instances for a player's hand (resolves persisted ids)
  getPlayerCards(playerId: number) : Card[] {
    const hand = this.gameContext.playersList[playerId].hand
    const out: Card[] = []
    for (const id of hand) {    
      const c : Card = this.allCards.cards[id]
      console.debug('[GameEngine] getPlayerCards lookup id=', id, '->', !!c)
      if (c) {
        out.push(c)
      }
    }
    return out
  }

  // Helper: normalize a card reference to its id string
  getCardId(card: Card) {
    return card.id
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
  importState(snapshot: any): boolean {
    console.log('[GameEngine] importState called with snapshot:', snapshot)
     try {
       if (!snapshot) return false
       // Accept shapes produced by webrtc service: { gameContext, workflow, deck }
       const ctx = snapshot.gameContext || snapshot.gameContext || snapshot || {}
       const wf = snapshot.workflow || snapshot.workflow || {}
       const deckPayload = snapshot.deck || {}
      
       // Recreate typed instances where applicable
       this.gameContext = new GameContext(ctx) 
       this.gameWorkflow = new GameWorkflowState(wf) 

       // Rebuild Deck instance from payload. Support both mapping objects and arrays of card payloads.
       const rebuilt = new Deck()
       try {
         if (Array.isArray(deckPayload)) {
           for (const entry of deckPayload) {
              rebuilt.cards[entry.id] = (Card as any).fromJSON ? (Card as any).fromJSON(entry) : entry
           }
         } else if (deckPayload && typeof deckPayload === 'object') {
           for (const k of Object.keys(deckPayload || {})) {
             const payload = (deckPayload as any)[k]
             try {
               rebuilt.cards[Number(k)] = (Card as any).fromJSON ? (Card as any).fromJSON(payload) : payload
             } catch (_e) {
               rebuilt.cards[Number(k)] = payload
             }
           }
         }
       } catch (_e) {
         // ignore and fall back to empty deck
       }
       this.allCards = rebuilt
       this.save(false);
       // Notify subscribers and UI
       try { this.emitStateChange() } catch (_e) {}
       return true
     } catch (e) {
       console.error('[GameEngine] importState failed', e)
       return false
     }
  }

  constructor() {
    if(!this.load()) {
      this.reset()
    }
  }

  reset() {
    // Initialize game context and cards registry, register all cards and deal hands.
    // create deck registry and collect ids
    this.allCards = new Deck( deckService.createDeck())
    const deck: number[] = this.allCards.getIds() || []

    // create new workflow and context
    this.gameWorkflow = new GameWorkflowState()
    
    // Shuffle the registered ids and assign as deck
    const deckArr: number[] = deck.slice()
    for (let i = deckArr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const tmp = deckArr[i]
      deckArr[i] = deckArr[j]
      deckArr[j] = tmp
    }

    this.gameContext = new GameContext({
      playerId: 0,
      playersList: [ 
        new Player({id: 0, name: 'Player 1', castleHp: 20, castleMaxHp: 20}), 
        new Player({id: 1, name: 'Player 2', castleHp: 20, castleMaxHp: 20}) 
      ],
      deck: deckArr,
      actionByPlayer: {}
    })


    // Deal 5 cards to each player (persist as UUID arrays in gameContext)
    const handSize = 5
    for (let i = 0; i < this.gameContext.playersList.length; i++) {
      const handIds: number[] = []
      for (let k = 0; k < handSize && deckArr.length; k++) {
        const cid = deckArr.shift() as number
        if (cid) handIds.push(cid)
      }
      this.gameContext.playersList[i].hand = handIds
    }
    this.gameContext.deck = deckArr
    // save initial state and persist card registry
    this.save(true)
  

    console.log('GameEngine initialized with context:', this.gameContext, this.gameWorkflow, this.allCards)
  }


  canAct() {
    return this.gameWorkflow.activePlayerId  === this.gameContext.playerId && !this.gameWorkflow.gameOver
  }


  shuffleDeck() {
    const deckArr = this.allCards.getIds() || []
    for (let i = deckArr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const tmp = deckArr[i]
      deckArr[i] = deckArr[j]
      deckArr[j] = tmp
    }
    this.gameContext.deck = deckArr
    this.save(true)
  }

 


  // market and buy mechanics removed

  getOwnCastleZone(playerId: number) {
    return Number(playerId) === 0 ? 0 : ZONES.length - 1
  }

  getEnemyCastleZone(playerId: number) {
    return Number(playerId) === 0 ? ZONES.length - 1 : 0
  }

  getSpawnZone(card: Card | null | undefined, playerId: number) {

  }

  // Play a card from hand onto the board (position 0). Reveals the card.
  playCard(playerId: number, handIndex: number): Boolean {
    console.log(`[GameEngine] playCard called with playerId=${playerId}, handIndex=${handIndex}`)

    const player = this.gameContext.playersList[playerId]
    const removedCards = player.hand.splice(handIndex, 1)
    
    removedCards.forEach(cid => {
      player.played.push({ cardId: cid, position:0 })
    })
    this.gameContext.playersList[playerId] = player

    this.gameWorkflow.actionByPlayer = this.gameWorkflow.actionByPlayer || {}
    this.gameWorkflow.actionByPlayer[playerId] = 'action-taken'

    const playersCount = this.gameContext.playersList.length
    const next = (playerId === 0) ? 1 : 0
    this.gameWorkflow.activePlayerId = next

    // if all players acted, advance round and clear actions
    const actedCount = Object.values(this.gameWorkflow.actionByPlayer || {}).filter(v => v === 'action-taken').length
    if (actedCount >= playersCount) {
      this.gameWorkflow.round = this.gameWorkflow.round + 1
      this.gameWorkflow.actionByPlayer = {}
    }

    // persist and notify
    removedCards.forEach(cid => {
      this.allCards.cards[cid].handler.onPlayed(cid, playerId, this)
    })
    this.save(true)

    return true
  }

  // Move a specific card by up to `steps` positions (must be non-negative)
  moveCard(cardId: string, playerId: number, steps: number): boolean {
    const can = this.canAct()
    if (!can) return can
      return false
  }

  // Persist internal state to localStorage (browser). Silent on failure.
  save(broadcast: boolean) {
   
    GameContextStorage.save(this.gameContext)
    GameWorkflowStateStorage.save(this.gameWorkflow)
    this.allCards.save()
    // notify subscribers that state changed
    this.emitStateChange()
    eventService.emit('engine:stateChange', this, broadcast)
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
  }

  hasStoredState() {
    try {
      return !!this.load()
    } catch (_e) {
      return false
    }
  }

  // Attempt to load state from separated storage keys. Returns true if restored.
  load() {
    const storedGame = GameContextStorage.load()
    const storedWorkflow = GameWorkflowStateStorage.load()
    const storedDeck = Deck.load()
    if (!storedGame || !storedWorkflow || !storedDeck) return false
    this.gameContext = storedGame
    this.gameWorkflow = storedWorkflow
    this.allCards = storedDeck
    this.emitStateChange()
    eventService.emit('engine:stateChange', this, false)
    return true
  }



  
}
