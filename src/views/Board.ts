import { ref, onMounted, onUnmounted } from 'vue'
import CardItem from '../components/CardItem.vue'
import CurrentPlayerBoard from '../components/CurrentPlayerBoard.vue'
import engine from '../game/engineInstance'
import { ZONES } from '../game/GameEngine'
import { useGameStateService } from '../services/gameStateService'
import { createEmptyGameStateView } from '../models/GameStateView'
import type { GameStateView, InPlayCardView, PlayerView } from '../models/GameStateView'

export default {
  name: 'BoardView',
  components: { CardItem, CurrentPlayerBoard },
  setup() {
    const gameState = useGameStateService()
    const zones = ZONES
    const state = ref<GameStateView>(createEmptyGameStateView())
    let timer: ReturnType<typeof setInterval> | null = null

    const dragged = ref<{ id: string, pos: number, vel: number } | null>(null) // { id, pos, vel }
    const reachable = ref<Set<number>>(new Set())
    const hoveredZone = ref(-1)
    const blockedZone = ref(-1)
    const blockedShake = ref(-1)
    const handDragVel = ref<number | null>(null)

    function normalizedStateFromEngine(): GameStateView {
      const rawState = (engine.getState() || {}) as Record<string, any>
      return {
        ...createEmptyGameStateView(),
        ...rawState,
        activePlayerId: Number(rawState.activePlayerId || 0),
        currentUser: Number(rawState.currentUser ?? rawState.activePlayerId ?? 0),
        round: Number(rawState.round || 1),
        players: (rawState.players || []).map((player: any): PlayerView => ({
          ...player,
          id: Number(player.id)
        })),
        cardsInPlay: (rawState.cardsInPlay || []).map((entry: any): InPlayCardView => ({
          ...entry,
          ownerId: Number(entry.ownerId),
          position: Number(entry.position)
        }))
      }
    }

    function refresh() {
      state.value = normalizedStateFromEngine()
    }

    function computeReachable() {
      reachable.value = new Set()
      if (!dragged.value) return
      const start = dragged.value.pos
      const active = Number(state.value.activePlayerId || 0)
      const direction = active === 0 ? 1 : -1
      for (let i = 0; i <= (dragged.value.vel || 0); i++) {
        const pos = start + (direction * i)
        if (pos >= 0 && pos < ZONES.length) reachable.value.add(pos)
      }
    }

    function cardsByZone(idx: number) {
      return (state.value.cardsInPlay || []).filter((g) => g.position === idx)
    }

    function handCountForPlayer(playerId: number) {
      return gameState.getPlayerCards(playerId, 'game').length
    }

    function onDragStart(evt: DragEvent, cardId: string) {
      const g = (engine.cardsInPlay as any[]).find(x => x.id === cardId)
      if (!g) return
      dragged.value = { id: cardId, pos: g.position, vel: g.card.velocity ?? 0 }
      computeReachable()
      if (!evt.dataTransfer) return
      evt.dataTransfer.setData('text/plain', cardId)
      evt.dataTransfer.effectAllowed = 'move'
    }

    function onZoneDragOver(evt: DragEvent, idx: number) {
      // show hovered zone and allow drop only if reachable
      hoveredZone.value = idx
      blockedZone.value = -1
      if (!evt.dataTransfer) return
      // If dragging a hand card, only own castle is a valid drop target.
      try {
        const dt = evt.dataTransfer.getData('text/plain') || ''
        if (dt.startsWith('hand:')) {
          const parts = dt.split(':')
          const playerId = Number(parts[1])
          const vel = Number(parts[3] || 0)
          handDragVel.value = vel
          // if player already played this round, show blocked overlay instead of allowing drop
          if (state.value.playedThisRound && state.value.playedThisRound[playerId]) {
            reachable.value = new Set()
            blockedZone.value = idx
            evt.dataTransfer.dropEffect = 'none'
            evt.preventDefault()
            return
          }
          const ownCastle = playerId === 0 ? 0 : ZONES.length - 1
          reachable.value = new Set<number>([ownCastle])
        }
      } catch (e) {
        // ignore
      }
      evt.preventDefault()
    }

    function onZoneDragLeave() {
      hoveredZone.value = -1
      blockedZone.value = -1
      handDragVel.value = null
    }

    function onDrop(evt: DragEvent, targetZone: number) {
      if (!evt.dataTransfer) return
      const payload = evt.dataTransfer.getData('text/plain')
      if (!payload) return

      // hand drag format: hand:<playerId>:<handIndex>
      if (payload.startsWith('hand:')) {
        const parts = payload.split(':')
        if (parts.length < 3) return alert('invalid hand payload')
        const playerId = Number(parts[1])
        const handIndex = Number(parts[2])
        if (playerId !== state.value.activePlayerId) return alert('not your hand')
        if (handIndex < 0 || handIndex >= handCountForPlayer(playerId)) return alert('invalid hand index')
        if (state.value.playedThisRound && state.value.playedThisRound[playerId]) {
          // trigger shake and haptic feedback
          blockedShake.value = targetZone
          blockedZone.value = targetZone
          try { if (navigator && (navigator.vibrate)) navigator.vibrate?.(50) } catch (e) {}
          setTimeout(() => { blockedShake.value = -1; blockedZone.value = -1 }, 600)
          reachable.value = new Set()
          hoveredZone.value = -1
          handDragVel.value = null
          return
        }
        const res = engine.playCardTo(playerId, handIndex, targetZone)
        if (!res.ok) return alert('Play failed: ' + ((res as any).reason || 'invalid action'))
        reachable.value = new Set()
        hoveredZone.value = -1
        blockedZone.value = -1
        handDragVel.value = null
        refresh()
        return
      }

      // otherwise, moving an existing card in play
      const cardId = payload
      const g = (engine.cardsInPlay as any[]).find(x => x.id === cardId)
      if (!g) return alert('card not found')
      if (g.ownerId !== state.value.activePlayerId) return alert('you can only move your own cards')
      const direction = state.value.activePlayerId === 0 ? 1 : -1
      const steps = (targetZone - g.position) * direction
      if (steps < 0) return alert('cannot move backwards')
      if (steps === 0) return
      const velocity = Number(g.card?.velocity || 0)
      if (!Number.isFinite(velocity) || velocity <= 0) return alert('card has no velocity')
      if (steps !== velocity) return alert(`must move exactly ${velocity} zones`)
      if (!reachable.value.has(targetZone)) return alert('target out of reach')
      const res = engine.moveCard(cardId, state.value.activePlayerId, steps)
      if (!res.ok) return alert('Move failed: ' + ((res as any).reason || 'invalid action'))
      dragged.value = null
      reachable.value = new Set()
      hoveredZone.value = -1
      refresh()
    }

    function zoneClass(idx: number) {
      // if dragging an in-play card, color by distance from start
      if (dragged.value && Number.isFinite(dragged.value.pos)) {
        const start = dragged.value.pos
        const vel = dragged.value.vel || 0
        const dist = idx - start
        if (dist >= 0 && dist <= vel) return `in-range range-${Math.min(8, dist)}`
      }
      // if dragging from hand, use handDragVel to colour from active player's castle
      if (handDragVel.value != null) {
        const active = Number(state.value.activePlayerId || 0)
        const start = active === 0 ? 0 : (ZONES.length - 1)
        const direction = active === 0 ? 1 : -1
        const dist = (idx - start) * direction
        if (dist >= 0 && dist <= (handDragVel.value || 0)) return `in-range range-${Math.min(8, dist)}`
      }
      return ''
    }

    onMounted(() => {
      refresh()
      timer = setInterval(refresh, 700)
    })
    onUnmounted(() => {
      if (timer) clearInterval(timer)
    })

    return {
      zones,
      state,
      refresh,
      cardsByZone,
      onDragStart,
      onZoneDragOver,
      onZoneDragLeave,
      onDrop,
      reachable,
      hoveredZone,
      blockedZone,
      blockedShake,
      zoneClass
    }
  }
}
