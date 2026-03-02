import { ref, computed } from 'vue'
import deckService from './deckService'

type TurnWorkflowState = {
  started: boolean
  activePlayerId: number
  round: number
  lastAction: string
  actionByPlayer: Record<string, string>
  castleHpByPlayer: Record<string, number>
  castleMaxHp: number
  gameOver: boolean
  loserPlayerId: number | null
  winnerPlayerId: number | null
}

type ContextState = {
  deck: any[]
  players: Record<string, any[]>
  workflow: TurnWorkflowState
}

const state = ref<Record<string, ContextState>>({})

function createDefaultWorkflowState(): TurnWorkflowState {
  return {
    started: false,
    activePlayerId: 0,
    round: 1,
    lastAction: '',
    actionByPlayer: {},
    castleHpByPlayer: { '0': 20, '1': 20 },
    castleMaxHp: 20,
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
        workflow: createDefaultWorkflowState()
      }
    }
  }
  return key
}

function cloneWorkflow(workflow: Partial<TurnWorkflowState> | null | undefined): TurnWorkflowState {
  const base = createDefaultWorkflowState()
  if (!workflow || typeof workflow !== 'object') return base
  return {
    started: Boolean(workflow.started),
    activePlayerId: Number.isFinite(workflow.activePlayerId) ? Number(workflow.activePlayerId) : base.activePlayerId,
    round: Number.isFinite(workflow.round) ? Math.max(1, Number(workflow.round)) : base.round,
    lastAction: String(workflow.lastAction || ''),
    actionByPlayer: { ...(workflow.actionByPlayer || {}) },
    castleHpByPlayer: { ...(workflow.castleHpByPlayer || base.castleHpByPlayer) },
    castleMaxHp: Number.isFinite(workflow.castleMaxHp) ? Math.max(1, Number(workflow.castleMaxHp)) : base.castleMaxHp,
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

  clearContext(context = 'game') {
    const key = ensureContext(context)
    state.value[key] = {
      deck: [],
      players: {},
      workflow: createDefaultWorkflowState()
    }
  }
}

const gameStateService = new GameStateService()

export default gameStateService

export function useGameStateService() {
  return gameStateService
}
