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
  if (!hasLocalStorage()) return false
  try {
    window.localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(context || {}))
    return true
  } catch (e) {
    console.warn('saveGameState failed', e)
    return false
  }
}

export function loadGameState(): GameContext | null {
  if (!hasLocalStorage()) return null
  try {
    const raw = window.localStorage.getItem(GAME_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return new GameContext(parsed)
  } catch (e) {
    console.warn('loadGameState failed', e)
    return null
  }
}

export function clearGameState() {
  if (!hasLocalStorage()) return false
  try {
    window.localStorage.removeItem(GAME_STORAGE_KEY)
    return true
  } catch (e) {
    console.warn('clearGameState failed', e)
    return false
  }
}

export function saveWorkflowState(workflow: Partial<GameWorkflowState>) {
  if (!hasLocalStorage()) return false
  try {
    window.localStorage.setItem(WORKFLOW_STORAGE_KEY, JSON.stringify(workflow || {}))
    return true
  } catch (e) {
    console.warn('saveWorkflowState failed', e)
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
  if (!hasLocalStorage()) return false
  try {
    window.localStorage.removeItem(WORKFLOW_STORAGE_KEY)
    return true
  } catch (e) {
    console.warn('clearWorkflowState failed', e)
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
  if (!hasLocalStorage()) return false
  try {
    window.localStorage.setItem(storageKeyFor(context, 'deck'), JSON.stringify(deck || []))
    return true
  } catch (e) {
    return false
  }
}

export function setPlayerCards(key: string, cards: any[], context = 'game') {
  if (!hasLocalStorage()) return false
  try {
    window.localStorage.setItem(storageKeyFor(context, `player:${key}`), JSON.stringify(cards || []))
    return true
  } catch (e) {
    return false
  }
}

export function getPlayerCards(key: string, context = 'game') {
  if (!hasLocalStorage()) return []
  try {
    const raw = window.localStorage.getItem(storageKeyFor(context, `player:${key}`))
    if (!raw) return []
    return JSON.parse(raw)
  } catch (e) {
    return []
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
  if (!hasLocalStorage()) return false
  try {
    window.localStorage.setItem(storageKeyFor(context, 'history'), JSON.stringify(history || []))
    return true
  } catch (e) {
    return false
  }
}

const defaultExport = {
  saveGameState,
  loadGameState,
  clearGameState,
  saveWorkflowState,
  loadWorkflowState,
  clearWorkflowState,
  ensureDeck,
  getDeck,
  setDeck,
  setPlayerCards,
  getPlayerCards,
  getHistory,
  setHistory
}

export default defaultExport
