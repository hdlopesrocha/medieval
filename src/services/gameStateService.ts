import { ref, computed } from 'vue'
import deckService from './deckService'

const state = ref<Record<string, { deck: any[], players: Record<string, any[]> }>>({})

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
        players: {}
      }
    }
  }
  return key
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

  clearContext(context = 'game') {
    const key = ensureContext(context)
    state.value[key] = {
      deck: [],
      players: {}
    }
  }
}

const gameStateService = new GameStateService()

export default gameStateService

export function useGameStateService() {
  return gameStateService
}
