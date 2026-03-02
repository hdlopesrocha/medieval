import { ref, computed, onMounted, onUnmounted, unref } from 'vue'
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButton } from '@ionic/vue'
import engine from '../game/engineInstance'
import CardItem from '../components/CardItem.vue'
import CurrentPlayerBoard from '../components/CurrentPlayerBoard.vue'
import { ZONES, ZONE_ELEMENTS } from '../game/GameEngine'
import { useGameStateService } from '../services/gameStateService'
import { useRouter } from 'vue-router'
import { useWebrtcQrService } from '../services/webrtcQrService'
import { sortCardsInPlayBySlot } from '../utils/sortCardsInPlay'
import { createEmptyGameStateView } from '../models/GameStateView'
import type { GameStateView, InPlayCardView, PlayerView } from '../models/GameStateView'
import type { CardJSON } from '../models/Card'

type GameActionResult = {
  ok?: boolean
  reason?: string
  pending?: boolean
} & Record<string, unknown>

type RealtimeBridge = {
  activeRole?: string
  isRealtimeGameActive?: boolean
  syncGameStateToClient?: (action: string) => void
  requestGameAction?: (action: string, payload: Record<string, unknown>) => boolean
  lastGameError?: string
}

export default {
  name: 'LocalPlayerPage',
  components: { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, CardItem, CurrentPlayerBoard },
  setup() {
    const anyEngine = engine as any
    const router = useRouter()
    const state = ref<GameStateView>(createEmptyGameStateView())
    const gameState = useGameStateService()
    const webrtcQr = useWebrtcQrService()
    const realtime = webrtcQr as unknown as RealtimeBridge
    let timer: ReturnType<typeof setInterval> | null = null

    function currentRole() {
      return String(unref(realtime.activeRole) || '')
    }

    const deckCards = gameState.getDeckRef('game')
    const activeHandCards = computed(() => gameState.getPlayerCards(state.value.activePlayerId || 0, 'game'))
    const localHandCards = computed(() => gameState.getPlayerCards(localPlayerId.value || 0, 'game'))
    const localPlayerId = computed(() => {
      if (!multiplayerMode.value) return Number(state.value.activePlayerId || 0)
      return currentRole() === 'client' ? 1 : 0
    })
    const multiplayerMode = computed(() => Boolean(unref(realtime.isRealtimeGameActive)))
    const isServerAuthority = computed(() => multiplayerMode.value && currentRole() === 'server')
    const isClientProxy = computed(() => multiplayerMode.value && currentRole() === 'client')
    const isLocalPlayersTurn = computed(() => Number(state.value.activePlayerId || 0) === Number(localPlayerId.value || 0))
    const tableCardsInPlay = computed(() => sortCardsInPlayBySlot(state.value.cardsInPlay, state.value.activePlayerId))
    const currentPlayingUserLabel = computed(() => {
      const currentId = Number(state.value.currentUser ?? state.value.activePlayerId ?? 0)
      const player = (state.value.players || []).find((p: PlayerView) => Number(p.id) === currentId)
      if (player?.name) return `${player.name} (Player ${currentId})`
      return `Player ${currentId}`
    })
    const pendingConfirmation = ref<null | {
      kind: 'play-card' | 'move-card' | 'attack-card' | 'use-ability'
      playerId: number
      actionLabel: string
      card?: Partial<CardJSON>
      handIndex?: number
      sourceId?: string
      targetId?: string
      steps?: number
      maxSteps?: number
      summaryLines?: string[]
    }>(null)

    function normalizedStateFromEngine(): GameStateView {
      const rawState = (engine.getState() || {}) as Record<string, unknown>
      const rawPlayers = Array.isArray(rawState.players) ? rawState.players : []
      const rawCardsInPlay = Array.isArray(rawState.cardsInPlay) ? rawState.cardsInPlay : []
      const nextState: GameStateView = {
        ...createEmptyGameStateView(),
        ...rawState,
        activePlayerId: Number(rawState.activePlayerId || 0),
        currentUser: Number(rawState.currentUser ?? rawState.activePlayerId ?? 0),
        round: Number(rawState.round || 1),
        gameOver: Boolean(rawState.gameOver),
        loserPlayerId: rawState.loserPlayerId == null ? null : Number(rawState.loserPlayerId),
        winnerPlayerId: rawState.winnerPlayerId == null ? null : Number(rawState.winnerPlayerId),
        playedThisRound: (rawState.playedThisRound as Record<string, unknown>) || {},
        castleHpByPlayer: (rawState.castleHpByPlayer as Record<number, number>) || {},
        players: rawPlayers.map((player): PlayerView => {
          const row = (player || {}) as Record<string, unknown>
          return {
            id: Number(row.id || 0),
            name: typeof row.name === 'string' ? row.name : undefined
          }
        }),
        cardsInPlay: rawCardsInPlay.map((entry): InPlayCardView => {
          const row = (entry || {}) as Record<string, unknown>
          return {
            id: String(row.id || ''),
            ownerId: Number(row.ownerId || 0),
            position: Number(row.position || 0),
            hidden: Boolean(row.hidden),
            card: (row.card && typeof row.card === 'object') ? (row.card as InPlayCardView['card']) : undefined
          }
        })
      }
      return nextState
    }

    function refreshState() {
      state.value = normalizedStateFromEngine()
    }

    function runGameAction(action: string, payload: Record<string, unknown>, localExec: () => GameActionResult): GameActionResult {
      if (!multiplayerMode.value) {
        return localExec()
      }
      if (isServerAuthority.value) {
        const result = localExec()
        if (result?.ok !== false) {
          realtime.syncGameStateToClient?.(action)
        }
        return result
      }
      if (isClientProxy.value) {
        const sent = realtime.requestGameAction?.(action, payload)
        if (!sent) return { ok: false, reason: realtime.lastGameError || 'client channel not open' }
        return { ok: true, pending: true }
      }
      return localExec()
    }

    function playerHandCards(playerId: number) {
      return gameState.getPlayerCards(playerId, 'game')
    }

    function handCountByPlayer(playerId: number) {
      return playerHandCards(playerId).length
    }

    function canConvert(attacker: InPlayCardView | undefined | null) {
      if (!attacker || !attacker.card) return false
      const range = Number(attacker.card.range || 0)
      const enemies = (state.value.cardsInPlay || []).filter((card) => card.ownerId !== state.value.activePlayerId)
      return enemies.some((target) => Math.abs(target.position - attacker.position) <= range)
    }

    function start() {
      const res = runGameAction('startGame', {}, () => {
        engine.startGame(['Server', 'Client'])
        return { ok: true }
      })
      if (!res.ok) return alert('Start failed: ' + (res.reason || 'invalid action'))
      refreshState()
    }

    function next() {
      if (multiplayerMode.value) return alert('Next phase is disabled in realtime multiplayer mode')
      engine.nextPhase()
      refreshState()
    }

    function goHistory() {
      router.push('/history')
    }

    function goMap() {
      router.push('/map')
    }

    function castleHp(playerId: number) {
      return Number(state.value.castleHpByPlayer?.[playerId] ?? 0)
    }

    function zoneName(pos: number) {
      return ZONES[pos] ?? ''
    }

    const fileInput = ref<HTMLInputElement | null>(null)

    function exportState() {
      try {
        const data = engine.exportState()
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'tocabola_state.json'
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(url)
      } catch (e) {
        alert('Export failed: ' + e)
      }
    }

    function triggerImport() {
      if (fileInput.value) fileInput.value.click()
    }

    async function onFileChange(ev: Event) {
      const target = ev.target as HTMLInputElement | null
      try {
        const f = target?.files?.[0]
        if (!f) return
        const txt = await f.text()
        const obj = JSON.parse(txt)
        const res = engine.importState(obj)
        if (!res.ok) return alert('Import failed: ' + res.reason)
        state.value = normalizedStateFromEngine()
        alert('Import successful')
      } catch (e) {
        alert('Invalid file: ' + e)
      } finally {
        if (target) target.value = ''
      }
    }

    function moveCardUI(cardId: string) {
      const g = state.value.cardsInPlay.find((x) => x.id === cardId)
      if (!g) return alert('card not found')
      const velocity = Number(g.card?.velocity ?? 0)
      if (!Number.isFinite(velocity) || velocity <= 0) return alert('Move failed: card has no velocity')
      const playerId = Number(state.value.activePlayerId || 0)
      const isWaterUnit = String(g.card?.element || 'earth') === 'water'
      let maxSteps = velocity

      if (isWaterUnit) {
        const direction = playerId === 0 ? 1 : -1
        let maxWaterSteps = 0
        for (let index = 1; index <= velocity; index++) {
          const nextZone = Number(g.position) + (direction * index)
          if (nextZone < 0 || nextZone >= ZONE_ELEMENTS.length) break
          if (ZONE_ELEMENTS[nextZone] !== 'water') break
          maxWaterSteps = index
        }
        if (maxWaterSteps <= 0) {
          return alert('Move failed: no reachable water zone for this boat')
        }
        maxSteps = maxWaterSteps
      }

      pendingConfirmation.value = {
        kind: 'move-card',
        playerId,
        actionLabel: 'Move',
        sourceId: cardId,
        steps: maxSteps,
        maxSteps,
        summaryLines: [
          `Card: ${String(g.card?.title || 'unknown')}`,
          `Choose steps from 0 to ${maxSteps}${isWaterUnit ? ` (water-limited from ${velocity})` : ''}`,
          `From zone: ${zoneName(Number(g.position || 0))}`
        ]
      }
    }

    function setPendingMoveSteps(rawValue: unknown) {
      if (!pendingConfirmation.value || pendingConfirmation.value.kind !== 'move-card') return
      const maxSteps = Math.max(0, Number(pendingConfirmation.value.maxSteps || 0))
      let next = Number(rawValue)
      if (!Number.isFinite(next)) next = 0
      next = Math.trunc(next)
      if (next < 0) next = 0
      if (next > maxSteps) next = maxSteps
      pendingConfirmation.value.steps = next
    }

    function attackCardUI(attackerId: string) {
      const attacker = state.value.cardsInPlay.find((x) => x.id === attackerId)
      if (!attacker) return alert('attacker not found')
      const targets = state.value.cardsInPlay.filter((x) => x.ownerId !== state.value.activePlayerId)
      if (!targets.length) return alert('no targets')
      selection.value.mode = 'attack'
      selection.value.sourceId = attackerId
      selection.value.candidates = targets
    }

    function convertCardUI(attackerId: string) {
      const attacker = state.value.cardsInPlay.find((x) => x.id === attackerId)
      if (!attacker) return alert('attacker not found')
      const targets = state.value.cardsInPlay.filter((x) => x.ownerId !== state.value.activePlayerId)
      if (!targets.length) return alert('no targets')
      selection.value.mode = 'convert'
      selection.value.sourceId = attackerId
      selection.value.candidates = targets
    }

    const selection = ref<{ mode: string | null, sourceId: string | null, candidates: InPlayCardView[] }>({ mode: null, sourceId: null, candidates: [] })

    function cancelSelection() {
      selection.value.mode = null
      selection.value.sourceId = null
      selection.value.candidates = []
    }

    async function selectTarget(targetId: string) {
      const playerId = state.value.activePlayerId || 0
      const sourceId = String(selection.value.sourceId || '')
      if (!sourceId) return
      const sourceCard = state.value.cardsInPlay.find((x) => x.id === sourceId)
      const targetCard = state.value.cardsInPlay.find((x) => x.id === targetId)

      if (selection.value.mode === 'attack') {
        pendingConfirmation.value = {
          kind: 'attack-card',
          playerId,
          actionLabel: 'Attack',
          sourceId,
          targetId,
          summaryLines: [
            `Attacker: ${String(sourceCard?.card?.title || 'unknown')}`,
            `Target: ${String(targetCard?.card?.title || 'unknown')}`
          ]
        }
      } else if (selection.value.mode === 'convert') {
        const res = engine.convertCard(sourceId, targetId, playerId)
        if (!res.ok) return alert('Convert failed: ' + res.reason)
        refreshState()
      } else if (selection.value.mode === 'ability') {
        pendingConfirmation.value = {
          kind: 'use-ability',
          playerId,
          actionLabel: 'Use Ability',
          sourceId,
          targetId,
          summaryLines: [
            `Source: ${String(sourceCard?.card?.title || 'unknown')}`,
            `Target: ${String(targetCard?.card?.title || 'none')}`
          ]
        }
      }

      cancelSelection()
    }

    function openAbilitySelector(cardId: string) {
      selection.value.mode = 'ability'
      selection.value.sourceId = cardId
      selection.value.candidates = state.value.cardsInPlay || []
    }

    function useAbilityNoTarget(cardId: string) {
      const playerId = state.value.activePlayerId || 0
      const sourceCard = state.value.cardsInPlay.find((x) => x.id === cardId)
      pendingConfirmation.value = {
        kind: 'use-ability',
        playerId,
        actionLabel: 'Use Ability',
        sourceId: cardId,
        summaryLines: [
          `Source: ${String(sourceCard?.card?.title || 'unknown')}`,
          'Target: none'
        ]
      }
    }

    function endTurn() {
      const res = runGameAction('endTurn', {}, () => engine.endTurn())
      if (!res.ok) return alert('End turn failed: ' + res.reason)
      refreshState()
    }

    function playFromHand(idx: number) {
      const playerId = multiplayerMode.value
        ? Number(localPlayerId.value || 0)
        : Number(state.value.activePlayerId || 0)
      const card = localHandCards.value[idx]
      if (!card) return alert('Card not found in hand')
      pendingConfirmation.value = {
        kind: 'play-card',
        handIndex: idx,
        playerId,
        actionLabel: 'Play card',
        card
      }
    }

    function cancelPendingConfirmation() {
      pendingConfirmation.value = null
    }

    function confirmPendingConfirmation() {
      const pending = pendingConfirmation.value
      if (!pending) return
      pendingConfirmation.value = null

      if (pending.kind === 'play-card') {
        const playerId = multiplayerMode.value
          ? Number(localPlayerId.value || 0)
          : Number(state.value.activePlayerId || 0)
        const handIndex = Number(pending.handIndex ?? -1)
        const res = runGameAction('playCard', { playerId, handIndex }, () => engine.playCard(playerId, handIndex))
        if (!res.ok) return alert('Play failed: ' + (res.reason || 'invalid action'))

        refreshState()
        return
      }

      if (pending.kind === 'move-card') {
        const sourceId = String(pending.sourceId || '')
        const playerId = Number(pending.playerId || state.value.activePlayerId || 0)
        const maxSteps = Math.max(0, Number(pending.maxSteps || 0))
        let steps = Number(pending.steps || 0)
        if (!Number.isFinite(steps)) steps = 0
        steps = Math.max(0, Math.min(maxSteps, Math.trunc(steps)))
        const res = runGameAction('moveCard', { cardId: sourceId, playerId, steps }, () => engine.moveCard(sourceId, playerId, steps))
        if (!res.ok) return alert('Move failed: ' + (res.reason || 'invalid action'))
        refreshState()
        return
      }

      if (pending.kind === 'attack-card') {
        const attackerId = String(pending.sourceId || '')
        const targetId = String(pending.targetId || '')
        const playerId = Number(pending.playerId || state.value.activePlayerId || 0)
        const res = runGameAction('attackCard', { attackerId, targetId, playerId }, () => engine.attackCard(attackerId, targetId, playerId))
        if (!res.ok) return alert('Attack failed: ' + (res.reason || 'invalid action'))
        refreshState()
        return
      }

      if (pending.kind === 'use-ability') {
        const sourceId = String(pending.sourceId || '')
        const targetId = pending.targetId ? String(pending.targetId) : undefined
        const playerId = Number(pending.playerId || state.value.activePlayerId || 0)
        const res = targetId
          ? anyEngine.useCardAbility(sourceId, playerId, targetId)
          : anyEngine.useCardAbility(sourceId, playerId)
        if (!res.ok) return alert('Ability failed: ' + res.reason)
        refreshState()
      }
    }

    function onHandDragStart(evt: DragEvent, handIndex: number, card: Partial<CardJSON> | undefined) {
      if (!evt.dataTransfer) return
      const playerId = Number(state.value.activePlayerId || 0)
      const vel = (card && Number(card.velocity)) ? Number(card.velocity) : 0
      evt.dataTransfer.setData('text/plain', `hand:${playerId}:${handIndex}:${vel}`)
      evt.dataTransfer.effectAllowed = 'copy'
    }

    onMounted(() => {
      refreshState()
      timer = setInterval(refreshState, 500)
    })

    onUnmounted(() => {
      if (timer) clearInterval(timer)
    })

    return {
      state,
      tableCardsInPlay,
      deckCards,
      activeHandCards,
      localHandCards,
      localPlayerId,
      isLocalPlayersTurn,
      currentPlayingUserLabel,
      pendingConfirmation,
      multiplayerMode,
      playerHandCards,
      handCountByPlayer,
      castleHp,
      start,
      next,
      goHistory,
      goMap,
      zoneName,
      moveCardUI,
      attackCardUI,
      exportState,
      triggerImport,
      onFileChange,
      fileInput,
      playFromHand,
      cancelPendingConfirmation,
      confirmPendingConfirmation,
      setPendingMoveSteps,
      onHandDragStart,
      canConvert,
      selection,
      selectTarget,
      cancelSelection,
      openAbilitySelector,
      useAbilityNoTarget,
      endTurn,
      convertCardUI
    }
  }
}
