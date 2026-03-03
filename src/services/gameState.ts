import { computed } from 'vue'
import engine from '../game/engineInstance'
import { GameContext } from '../models/GameContext'
import { GameWorkflowState } from '../models/GameWorkflowState'

function getPlayerCards(playerId: number, _contextName?: string) {
  return engine.gameContext.getPlayerCards(playerId)
}

function getDeckRef(_contextName?: string) {
  return computed(() => engine.gameContext.getDeck())
}

function getHistory(_contextName?: string) {
  // History is managed on workflow state; engine currently does not persist
  // workflow history into gameContext. Return empty array as a safe default.
  return [] as any[]
}

function clearHistory(_contextName?: string) {
  // no-op fallback
}

export default {
  getPlayerCards,
  getDeckRef,
  getHistory,
  clearHistory
}
