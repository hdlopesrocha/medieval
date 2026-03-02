import { ref, onMounted, onUnmounted } from 'vue'
import CardItem from '../components/CardItem.vue'
import engine from '../game/engineInstance'
import { ZONES } from '../game/GameEngine'
import { useGameStateService } from '../services/gameStateService'

export default {
  name: 'BoardView',
  components: { CardItem },
  setup() {
    const gameState = useGameStateService()
    const zones = ZONES
    const state = ref(engine.getState())
    let timer: ReturnType<typeof setInterval> | null = null

    const dragged = ref<{ id: string, pos: number, vel: number } | null>(null) // { id, pos, vel }
    const reachable = ref<Set<number>>(new Set())
    const hoveredZone = ref(-1)
    const blockedZone = ref(-1)
    const blockedShake = ref(-1)
    const handDragVel = ref<number | null>(null)

    function refresh() {
      state.value = engine.getState()
    }

    function computeReachable() {
      reachable.value = new Set()
      if (!dragged.value) return
      const start = dragged.value.pos
      const max = Math.min(ZONES.length - 1, start + (dragged.value.vel || 0))
      for (let i = start; i <= max; i++) reachable.value.add(i)
    }

    function cardsByZone(idx: number) {
      return (state.value.cardsInPlay || []).filter((g: any) => g.position === idx)
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
      // If dragging a hand card, mark all zones reachable so player can drop to any zone
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
          const all = new Set<number>()
          for (let i = 0; i < ZONES.length; i++) all.add(i)
          reachable.value = all
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
        if (!res.ok) return alert('Play failed: ' + res.reason)
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
      const steps = targetZone - g.position
      if (steps < 0) return alert('cannot move backwards')
      if (steps === 0) return
      if (!reachable.value.has(targetZone)) return alert('target out of reach')
      const res = engine.moveCard(cardId, state.value.activePlayerId, steps)
      if (!res.ok) return alert('Move failed: ' + res.reason)
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
      // if dragging from hand, use handDragVel to colour from player's castle (pos 0)
      if (handDragVel.value != null) {
        const dist = idx - 0
        if (dist >= 0 && dist <= (handDragVel.value || 0)) return `in-range range-${Math.min(8, dist)}`
      }
      return ''
    }

    onMounted(() => {
      timer = setInterval(refresh, 700)
    })
    onUnmounted(() => {
      if (timer) clearInterval(timer)
    })

    return { zones, state, refresh, cardsByZone, onDragStart, onZoneDragOver, onZoneDragLeave, onDrop, reachable, hoveredZone }
  }
}
