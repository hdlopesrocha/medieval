import { GameHistoryEntry } from './GameHistoryEntry'

export class GameWorkflowState {
  started: boolean = true;
  activePlayerId: number = 0;
  ownerRole: string = '';
  round: number = 0;
  actionByPlayer: Record<string, string> = {};
  gameOver: boolean = false;
  loserPlayerId: number | null = null;
  winnerPlayerId: number | null = null;
  history: GameHistoryEntry[] = [];

  constructor(init?: Partial<GameWorkflowState>) {
    Object.assign(this, init);
  }

  get lastHistoryEntry(): GameHistoryEntry | null {
    const h = this.history || []
    return h.length ? h[h.length - 1] : null
  }



  appendHistory(entry: Omit<GameHistoryEntry, 'order' | 'timestamp' | 'isoTime'>) {
    const now = Date.now()
    const history = this.history || []
    const nextOrder = (history[history.length - 1]?.order || 0) + 1
    const safeEntry: GameHistoryEntry = {
      order: nextOrder,
      timestamp: now,
      isoTime: new Date(now).toISOString(),
      action: String(entry?.action || 'stateUpdate'),
      activePlayerId: Number(entry?.activePlayerId || 0),
      round: Number(entry?.round ?? 0),
      gameOver: Boolean(entry?.gameOver),
      deckCount: Math.max(0, Number(entry?.deckCount || 0)),
      cardsInPlayCount: Math.max(0, Number(entry?.cardsInPlayCount || 0)),
      castleHpByPlayer: { ...(entry?.castleHpByPlayer || {}) }
    }
    this.history = [...history, safeEntry]
  }

  setHistory(history: GameHistoryEntry[] = []) {
    const normalized = Array.isArray(history) ? history : []
    this.history = normalized
      .map((item, index) => {
        const timestamp = Number(item?.timestamp || Date.now())
        return {
          order: Math.max(1, Number(item?.order || index + 1)),
          timestamp,
          isoTime: String(item?.isoTime || new Date(timestamp).toISOString()),
          action: String(item?.action || 'stateUpdate'),
          activePlayerId: Number(item?.activePlayerId || 0),
          round: Number(item?.round ?? 0),
          gameOver: Boolean(item?.gameOver),
          deckCount: Math.max(0, Number(item?.deckCount || 0)),
          cardsInPlayCount: Math.max(0, Number(item?.cardsInPlayCount || 0)),
          castleHpByPlayer: { ...(item?.castleHpByPlayer || {}) }
        } as GameHistoryEntry
      })
      .sort((a, b) => a.order - b.order)
  }

  getHistory() {
    return (this.history || []).map((item: GameHistoryEntry) => ({ ...item, castleHpByPlayer: { ...(item.castleHpByPlayer || {}) } }))
  }

  clearHistory() {
    this.history = []
  }
}
