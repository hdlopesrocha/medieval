import { ref, computed, onMounted, onUnmounted, unref } from 'vue'
import { IonPage, IonContent, IonButton } from '@ionic/vue'
import engine from '../game/engineInstance'
import eventService from '../services/eventService'
import CardItem from '../components/CardItem.vue'
import ModalCard from '../components/ModalCard.vue'
import { ZONES, ZONE_ELEMENTS } from '../game/GameEngine'
// import GameContext from '../models/GameContext' if needed
import { useRouter } from 'vue-router'
import { useWebrtcQrService } from '../services/webrtcQrService'
import gameStateService from '../services/gameStateService'
import { sortCardsInPlayBySlot } from '../utils/sortCardsInPlay'
import type { GameContext } from '../models/GameContext'
import type { GameWorkflowState } from '../models/GameWorkflowState'
import type Card from '../models/Card'

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
  components: { IonPage, IonContent, IonButton, CardItem, ModalCard },
  setup() {
    const router = useRouter()
    // Use engine.getState() as the authoritative source; `tick` forces recompute.
    const tick = ref(0)
    // Reactive normalized state built from engine's gameContext and gameWorkflow
    const state = ref<any>(normalizedStateFromEngine())
    // Replace with GameContext instance usage
    const webrtcQr = useWebrtcQrService()
    const realtime = webrtcQr as unknown as RealtimeBridge
    let unsub: (() => void) | null = null



    const deckCards = computed(() => engine.deck)
    const localPlayerId = computed(() => {
      // Always use playerId from workflow if available
      return Number(state.value.playerId)
    })
    const activeHandCards = computed(() => engine.getPlayerCards(state.value.activePlayerId || 0))
    const localHandCards = computed(() => engine.getPlayerCards(localPlayerId.value || 0))
    const multiplayerMode = computed(() => Boolean(unref(realtime.isRealtimeGameActive)))
    const isServerAuthority = computed(() => multiplayerMode.value && state.value.playerId === 0)
    const isClientProxy = computed(() => multiplayerMode.value && state.value.playerId === 1)
    // Only allow play if localPlayerId === activePlayerId
    const tableCardsInPlay = computed(() => sortCardsInPlayBySlot(state.value.cardsInPlay, state.value.activePlayerId))
    const currentPlayingUserLabel = computed(() => {
      const currentId = Number(state.value.playerId ?? state.value.activePlayerId ?? 0)
      const player = (state.value.players || []).find((p: any) => Number(p.id) === currentId)
      if (player?.name) return `${player.name} (Player ${currentId})`
      return `Player ${currentId}`
    })
    const pendingConfirmation = ref<null | {
      kind: 'play-card' | 'move-card' | 'attack-card' | 'use-ability'
      playerId: number
      actionLabel: string
      card?: Partial<Card>
      handIndex?: number
      sourceId?: string
      targetId?: string
      steps?: number
      maxSteps?: number
      summaryLines?: string[]
    }>(null)

    function normalizedStateFromEngine(): any {
      const rawPlayers = Array.isArray(engine.players) ? engine.players : []
      const rawCardsInPlay = (Array.isArray(engine.players) ? engine.players : []).reduce((acc: any[], p: any) => {
        const ownerId = Number(p.id)
        const entries = Array.isArray(p.cardsInPlay) ? p.cardsInPlay : []
        for (const entry of entries) {
          const cid = Number((entry as any)?.cardId ?? (entry as any)?.id ?? NaN)
          if (!Number.isFinite(cid)) continue
          const pos = Number((entry as any)?.position ?? 0)
          const cardInst = engine.allCards[String(cid)] || null
          acc.push({ id: String(cid), ownerId, position: Number(pos ?? (cardInst as any)?.position ?? 0), hidden: Boolean((entry as any)?.hidden ?? (cardInst as any)?.hidden), card: cardInst })
        }
        return acc
      }, [])
      const wf: any = engine.gameWorkflow || {}
      const ctx: any = engine.gameContext || {}
      const castleHpByPlayer: Record<string, number> = {}
      for (const p of rawPlayers) {
        try { castleHpByPlayer[String(p.id)] = Number(p.castleHp ?? 0) } catch (_) { }
      }
      const nextState: any = {
        activePlayerId: Number(wf.activePlayerId ?? 0),
        playerId: Number(ctx.playerId ?? wf.activePlayerId ?? 0),
        round: Number(wf.round ?? 0),
        gameOver: Boolean(wf.gameOver),
        loserPlayerId: wf.loserPlayerId == null ? null : Number(wf.loserPlayerId),
        winnerPlayerId: wf.winnerPlayerId == null ? null : Number(wf.winnerPlayerId),
        playedThisRound: Object.fromEntries(Object.entries(engine.gameWorkflow.actionByPlayer || {}).map(([k, v]) => [k, v === 'action-taken'])),
        castleHpByPlayer,
        players: rawPlayers.map((player) => ({ id: Number(player?.id || 0), name: player?.name })),
        cardsInPlay: rawCardsInPlay.map((entry) => ({ id: String(entry?.id || ''), ownerId: Number(entry?.ownerId || 0), position: Number(entry?.position || 0), hidden: Boolean(entry?.hidden), card: entry?.card }))
      }
      // bump tick for any computed watchers that also rely on it
      tick.value++
      return nextState
    }

    function refreshState() {
      try {
        state.value = normalizedStateFromEngine()
      } catch (e) {
        // noop
      }
    }

    const isLocalPlayersTurn = computed(() => {
      tick.value
      return Number(state.value.playerId || 0) === Number(state.value.activePlayerId || 0)
    })

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
      return engine.getPlayerCards(playerId)
    }

    function handCountByPlayer(playerId: number) {
      return playerHandCards(playerId).length
    }

    function canConvert(attacker: any | undefined | null) {
      if (!attacker || !attacker.card) return false
      const range = Number(attacker.card.range || 0)
      const enemies = (state.value.cardsInPlay || []).filter((card) => card.ownerId !== state.value.activePlayerId)
      return enemies.some((target) => Math.abs(target.position - attacker.position) <= range)
    }


    function start() {
      const res = runGameAction('startGame', {}, () => {
        return { ok: true }
      })
      if (!res.ok) return alert('Start failed: ' + (((res as any).reason) || 'invalid action'))
      refreshState()
    }

    function next() {
      if (multiplayerMode.value) return alert('Next phase is disabled in realtime multiplayer mode')
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

   

    function triggerImport() {
      if (fileInput.value) fileInput.value.click()
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

      closeOpenModals()
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


    function closeOpenModals() {
      try {
        const modals = Array.from(document.querySelectorAll('ion-modal'))
        for (const m of modals) {
          try { (m as any).dismiss && (m as any).dismiss() } catch (e) { try { m.remove() } catch (_) {} }
        }
      } catch (e) {}
    }

    function cancelPendingConfirmation() {
      pendingConfirmation.value = null
    }

    function confirmPendingConfirmation() {
      const pending = pendingConfirmation.value
      if (!pending) return
      pendingConfirmation.value = null

    }

    onMounted(() => {
      refreshState()
      // subscribe to engine state changes
      try { unsub = eventService.on('engine:stateChange', () => { refreshState(); console.log('[LocalPlayerPage] engine emitted update') }) } catch (e) { unsub = null }
    })

    onUnmounted(() => {
      try { if (unsub) unsub() } catch (_) {}
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
      triggerImport,
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
