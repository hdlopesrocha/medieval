import { ref, computed, onMounted, onUnmounted, unref } from 'vue'
import { IonPage, IonContent, IonButton } from '@ionic/vue'
import engine from '../game/engineInstance'
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
    let timer: ReturnType<typeof setInterval> | null = null



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
      card?: Partial<CardJSON>
      handIndex?: number
      sourceId?: string
      targetId?: string
      steps?: number
      maxSteps?: number
      summaryLines?: string[]
    }>(null)

    function normalizedStateFromEngine(): any {
      const rawPlayers = Array.isArray(engine.players) ? engine.players : []
      const rawCardsInPlay = Array.isArray(engine.gameContext?.cardsInPlay) ? engine.gameContext.cardsInPlay : []
      const wf: any = engine.gameWorkflow || {}
      const ctx: any = engine.gameContext || {}
      const nextState: any = {
        activePlayerId: Number(wf.activePlayerId ?? 0),
        playerId: Number(ctx.playerId ?? wf.activePlayerId ?? 0),
        round: Number(wf.round ?? 0),
        gameOver: Boolean(wf.gameOver),
        loserPlayerId: wf.loserPlayerId == null ? null : Number(wf.loserPlayerId),
        winnerPlayerId: wf.winnerPlayerId == null ? null : Number(wf.winnerPlayerId),
          playedThisRound: Object.fromEntries(Object.entries(engine.gameWorkflow.actionByPlayer || {}).map(([k, v]) => [k, v === 'action-taken'])),
        castleHpByPlayer: (ctx.castleHpByPlayer || {}),
        players: rawPlayers.map((player: any) => ({ id: Number(player?.id || 0), name: player?.name })),
        cardsInPlay: rawCardsInPlay.map((entry: any) => ({ id: String(entry?.id || ''), ownerId: Number(entry?.ownerId || 0), position: Number(entry?.position || 0), hidden: Boolean(entry?.hidden), card: entry?.card }))
      }
      return nextState
    }

    function refreshState() {
      // Build the normalized state from engine's context/workflow and update reactive `state`.
      state.value = normalizedStateFromEngine()
      // bump tick for any computed watchers that also rely on it
      tick.value++
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
          try {
            if (engine && typeof (engine as any).createGameState === 'function') {
              (engine as any).createGameState()
            } else {
              engine.startGame(['Server', 'Client'])
            }
          } catch (e) {
            try { engine.startGame(['Server', 'Client']) } catch (_e) {}
          }
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
        // importState updated engine internals; refresh the reactive state from engine
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

    const selection = ref<{ mode: string | null, sourceId: string | null, candidates: any[] }>({ mode: null, sourceId: null, candidates: [] })

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
        closeOpenModals()
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
        closeOpenModals()
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
      closeOpenModals()
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
      // close any open card modal (if Play was clicked from inside a modal)
      try {
        const modals = Array.from(document.querySelectorAll('ion-modal'))
        for (const m of modals) {
          try { (m as any).dismiss && (m as any).dismiss() } catch (e) { try { m.remove() } catch (_) {} }
        }
      } catch (e) {}

      pendingConfirmation.value = {
        kind: 'play-card',
        handIndex: idx,
        playerId,
        actionLabel: 'Play card',
        card
      }
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
          ? engine.useCardAbility(sourceId, playerId, targetId)
          : engine.useCardAbility(sourceId, playerId)
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
      if (!multiplayerMode.value) {
        try {
              const result = engine.ensureStoredState ? engine.ensureStoredState(['Server', 'Client']) : { restored: false }
          if (!result?.restored) {
            try { engine.saveState('autoCreateLocalGame') } catch (e) {}
          }
        } catch (_e) {
          // ignore create errors and continue with current state
        }
      }
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
