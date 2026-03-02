import { ref, computed } from 'vue'
import deckService from './deckService'

type TurnWorkflowState = {
  started: boolean
  activePlayerId: number
  currentUser: number
  round: number
  lastAction: string
  actionByPlayer: Record<string, string>
  castleHpByPlayer: Record<string, number>
  castleMaxHp: Record<string, number>
  gameOver: boolean
  loserPlayerId: number | null
  winnerPlayerId: number | null
}

export type GameHistoryEntry = {
  order: number
  timestamp: number
  isoTime: string
  action: string
  activePlayerId: number
  round: number
  gameOver: boolean
  deckCount: number
  cardsInPlayCount: number
  castleHpByPlayer: Record<string, number>
}

type ContextState = {
  deck: any[]
  players: Record<string, any[]>
  workflow: TurnWorkflowState
  history: GameHistoryEntry[]
}

const state = ref<Record<string, ContextState>>({})

function createDefaultWorkflowState(): TurnWorkflowState {
  return {
    started: false,
    activePlayerId: 0,
    currentUser: 0,
    round: 1,
    lastAction: '',
    actionByPlayer: {},
    castleHpByPlayer: { '0': 20, '1': 20 },
    castleMaxHp: { '0': 20, '1': 20 },
    gameOver: false,
    loserPlayerId: null,
    winnerPlayerId: null
  }
}

function cloneCard(card: any) {
  if (!card) return null
  if (typeof card.toJSON === 'function') {
    return JSON.parse(JSON.stringify(card.toJSON()))
  }
  return JSON.parse(JSON.stringify(card))
}

function cloneCards(cards: any[] = []) {
  if (!Array.isArray(cards)) return []
  return cards.map(cloneCard).filter(Boolean)
}

function normalizeContext(context: string) {
  return String(context || 'game')
}

function ensureContext(context = 'game') {
  const key = normalizeContext(context)
  if (!state.value[key]) {
    state.value = {
      ...state.value,
      [key]: {
        deck: [],
        players: {},
        workflow: createDefaultWorkflowState(),
        history: []
      }
    }
  }
  return key
}

function cloneWorkflow(workflow: Partial<TurnWorkflowState> | null | undefined): TurnWorkflowState {
  const base = createDefaultWorkflowState()
  if (!workflow || typeof workflow !== 'object') return base
  const incomingMax = (workflow as any).castleMaxHp
  const normalizedMaxHp =
    (incomingMax && typeof incomingMax === 'object')
      ? { ...incomingMax }
      : Number.isFinite(incomingMax)
        ? { '0': Math.max(1, Number(incomingMax)), '1': Math.max(1, Number(incomingMax)) }
        : base.castleMaxHp
  return {
    started: Boolean(workflow.started),
    activePlayerId: Number.isFinite(workflow.activePlayerId) ? Number(workflow.activePlayerId) : base.activePlayerId,
    currentUser: Number.isFinite((workflow as any).currentUser)
      ? Number((workflow as any).currentUser)
      : (Number.isFinite(workflow.activePlayerId) ? Number(workflow.activePlayerId) : base.currentUser),
    round: Number.isFinite(workflow.round) ? Math.max(1, Number(workflow.round)) : base.round,
    lastAction: String(workflow.lastAction || ''),
    actionByPlayer: { ...(workflow.actionByPlayer || {}) },
    castleHpByPlayer: { ...(workflow.castleHpByPlayer || base.castleHpByPlayer) },
    castleMaxHp: normalizedMaxHp,
    gameOver: Boolean(workflow.gameOver),
    loserPlayerId: workflow.loserPlayerId == null ? null : Number(workflow.loserPlayerId),
    winnerPlayerId: workflow.winnerPlayerId == null ? null : Number(workflow.winnerPlayerId)
  }
}

class GameStateService {
  ensureDeck(context = 'game', cards?: any[]) {
    const key = ensureContext(context)
    if (state.value[key].deck.length) return
    const source = (Array.isArray(cards) && cards.length) ? cards : deckService.createDeck()
    state.value[key].deck = cloneCards(source)
  }

  setDeck(cards: any[], context = 'game') {
    const key = ensureContext(context)
    state.value[key].deck = cloneCards(cards)
  }

  getDeck(context = 'game') {
    const key = ensureContext(context)
    if (!state.value[key].deck.length) {
      this.ensureDeck(context)
    }
    return cloneCards(state.value[key].deck)
  }

  getDeckRef(context = 'game') {
    return computed(() => {
      const key = ensureContext(context)
      return state.value[key].deck
    })
  }

  setPlayerCards(playerId: string | number, cards: any[], context = 'game') {
    const key = ensureContext(context)
    const playerKey = String(playerId)
    state.value[key].players = {
      ...state.value[key].players,
      [playerKey]: cloneCards(cards)
    }
  }

  getPlayerCards(playerId: string | number, context = 'game') {
    const key = ensureContext(context)
    const playerKey = String(playerId)
    return cloneCards(state.value[key].players[playerKey] || [])
  }

  getPlayerCardsRef(playerId: string | number, context = 'game') {
    return computed(() => {
      const key = ensureContext(context)
      const playerKey = String(playerId)
      return state.value[key].players[playerKey] || []
    })
  }

  setAllPlayerCards(players: Record<string, any[]>, context = 'game') {
    const key = ensureContext(context)
    const cloned: Record<string, any[]> = {}
    for (const playerKey of Object.keys(players || {})) {
      cloned[playerKey] = cloneCards(players[playerKey] || [])
    }
    state.value[key].players = cloned
  }

  setWorkflow(workflow: Partial<TurnWorkflowState>, context = 'game') {
    const key = ensureContext(context)
    state.value[key].workflow = cloneWorkflow({ ...state.value[key].workflow, ...workflow })
  }

  getWorkflow(context = 'game') {
    const key = ensureContext(context)
    return cloneWorkflow(state.value[key].workflow)
  }

  getWorkflowRef(context = 'game') {
    return computed(() => {
      const key = ensureContext(context)
      return state.value[key].workflow
    })
  }

  appendHistory(entry: Omit<GameHistoryEntry, 'order' | 'timestamp' | 'isoTime'>, context = 'game') {
    const key = ensureContext(context)
    const now = Date.now()
    const nextOrder = (state.value[key].history[state.value[key].history.length - 1]?.order || 0) + 1
    const safeEntry: GameHistoryEntry = {
      order: nextOrder,
      timestamp: now,
      isoTime: new Date(now).toISOString(),
      action: String(entry?.action || 'stateUpdate'),
      activePlayerId: Number(entry?.activePlayerId || 0),
      round: Math.max(1, Number(entry?.round || 1)),
      gameOver: Boolean(entry?.gameOver),
      deckCount: Math.max(0, Number(entry?.deckCount || 0)),
      cardsInPlayCount: Math.max(0, Number(entry?.cardsInPlayCount || 0)),
      castleHpByPlayer: { ...(entry?.castleHpByPlayer || {}) }
    }
    state.value[key].history = [...state.value[key].history, safeEntry]
  }

  setHistory(history: GameHistoryEntry[] = [], context = 'game') {
    const key = ensureContext(context)
    const normalized = Array.isArray(history) ? history : []
    state.value[key].history = normalized
      .map((item, index) => {
        const timestamp = Number(item?.timestamp || Date.now())
        return {
          order: Math.max(1, Number(item?.order || index + 1)),
          timestamp,
          isoTime: String(item?.isoTime || new Date(timestamp).toISOString()),
          action: String(item?.action || 'stateUpdate'),
          activePlayerId: Number(item?.activePlayerId || 0),
          round: Math.max(1, Number(item?.round || 1)),
          gameOver: Boolean(item?.gameOver),
          deckCount: Math.max(0, Number(item?.deckCount || 0)),
          cardsInPlayCount: Math.max(0, Number(item?.cardsInPlayCount || 0)),
          castleHpByPlayer: { ...(item?.castleHpByPlayer || {}) }
        } as GameHistoryEntry
      })
      .sort((a, b) => a.order - b.order)
  }

  getHistory(context = 'game') {
    const key = ensureContext(context)
    return state.value[key].history.map(item => ({ ...item, castleHpByPlayer: { ...(item.castleHpByPlayer || {}) } }))
  }

  getHistoryRef(context = 'game') {
    return computed(() => {
      const key = ensureContext(context)
      return state.value[key].history
    })
  }

  clearHistory(context = 'game') {
    const key = ensureContext(context)
    state.value[key].history = []
  }

  clearContext(context = 'game') {
    const key = ensureContext(context)
    state.value[key] = {
      deck: [],
      players: {},
      workflow: createDefaultWorkflowState(),
      history: []
    }
  }
}

const gameStateService = new GameStateService()

export default gameStateService

export function useGameStateService() {
  return gameStateService
}
