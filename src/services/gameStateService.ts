import { GameContext } from '../models/GameContext'
import { GameWorkflowState } from '../models/GameWorkflowState'


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

export function saveGameState(context: Partial<GameContext>) {
  // Deprecated: writes are centralized in GameEngine.saveState(). No-op here.
  try {
    if (!hasLocalStorage()) return false
    console.warn('gameStateService.saveGameState is deprecated; use GameEngine.saveState')
    return true
  } catch (e) {
    return false
  }
}

export function loadGameState(): GameContext | null {
  if (!hasLocalStorage()) return null
  try {
    const raw = window.localStorage.getItem(GAME_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    console.log('Loaded game state from storage', parsed)
    return new GameContext(parsed)
  } catch (e) {
    console.warn('loadGameState failed', e)
    return null
  }
}



export function saveWorkflowState(workflow: Partial<GameWorkflowState>) {
  // Deprecated: writes are centralized in GameEngine.saveState(). No-op here.
  try {
    if (!hasLocalStorage()) return false
    console.warn('gameStateService.saveWorkflowState is deprecated; use GameEngine.saveState')
    return true
  } catch (e) {
    return false
  }
}

export function loadWorkflowState(): GameWorkflowState | null {
  if (!hasLocalStorage()) return null
  try {
    const raw = window.localStorage.getItem(WORKFLOW_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return new GameWorkflowState(parsed)
  } catch (e) {
    console.warn('loadWorkflowState failed', e)
    return null
  }
}

export function clearWorkflowState() {
  // Deprecated: centralize clearing through GameEngine.clearStoredState(). No-op.
  try {
    if (!hasLocalStorage()) return false
    console.warn('gameStateService.clearWorkflowState is deprecated; use GameEngine.clearStoredState')
    return true
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

export function getDeck(context = 'game') {
  if (!hasLocalStorage()) return []
  try {
    const raw = window.localStorage.getItem(storageKeyFor(context, 'deck'))
    if (!raw) return []
    return JSON.parse(raw)
  } catch (e) {
    return []
  }
}

export function setDeck(deck: any[], context = 'game') {
  // Deprecated: deck persistence is handled by GameEngine.saveState(). No-op here.
  try {
    if (!hasLocalStorage()) return false
    console.warn('gameStateService.setDeck is deprecated; use GameEngine.saveState')
    return true
  } catch (e) {
    return false
  }
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
  saveGameState,
  loadGameState,
  saveWorkflowState,
  loadWorkflowState,
  clearWorkflowState,
  ensureDeck,
  getDeck,
  setDeck,
  getHistory,
  setHistory
}

export default defaultExport
