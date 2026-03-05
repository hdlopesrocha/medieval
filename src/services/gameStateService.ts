import { GameContext, GameContextStorage } from '../models/GameContext'
import { GameWorkflowState, GameWorkflowStateStorage } from '../models/GameWorkflowState'


const GAME_STORAGE_KEY = 'tocabola:game'
const WORKFLOW_STORAGE_KEY = 'tocabola:workflow'
const NAMESPACE_SEPARATOR = ':'

function hasLocalStorage() {
  try {
    return typeof window !== 'undefined' && !!window.localStorage
  } catch (e) {
    return false
  }
}



export function saveWorkflowState(workflow: Partial<GameWorkflowState>) {
  // Delegate to `GameWorkflowState` storage helpers.
  try {
    if (!hasLocalStorage()) return false
    console.warn('gameStateService.saveWorkflowState is deprecated; use GameEngine.saveState')
    return GameWorkflowStateStorage.save(workflow)
  } catch (e) {
    return false
  }
}

export function loadWorkflowState(): GameWorkflowState | null {
  return GameWorkflowStateStorage.load()
}

export function clearWorkflowState() {
  // Delegate to `GameWorkflowState` storage helpers.
  try {
    if (!hasLocalStorage()) return false
    console.warn('gameStateService.clearWorkflowState is deprecated; use GameEngine.clearStoredState')
    return GameWorkflowStateStorage.clear()
  } catch (e) {
    return false
  }
}

function storageKeyFor(context: string, key: string) {
  const ctx = String(context || 'game')
  return `${GAME_STORAGE_KEY}${NAMESPACE_SEPARATOR}${ctx}${NAMESPACE_SEPARATOR}${key}`
}

export function ensureDeck(context = 'game') {
  // no-op for compatibility; callers will create deck when missing
  return true
}


export function getHistory(context = 'game') {
  if (!hasLocalStorage()) return []
  try {
    const raw = window.localStorage.getItem(storageKeyFor(context, 'history'))
    if (!raw) return []
    return JSON.parse(raw)
  } catch (e) {
    return []
  }
}

export function setHistory(history: any[], context = 'game') {
  // Deprecated: history persistence is handled by GameEngine.saveState(). No-op here.
  try {
    if (!hasLocalStorage()) return false
    console.warn('gameStateService.setHistory is deprecated; use GameEngine.saveState')
    return true
  } catch (e) {
    return false
  }
}

const defaultExport = {
  saveWorkflowState,
  loadWorkflowState,
  clearWorkflowState,
  ensureDeck,
  getHistory,
  setHistory
}

export default defaultExport
