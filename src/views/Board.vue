<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Board</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="refresh">Refresh</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="board grid">
        <div v-for="(zone, idx) in zones" :key="idx" class="zone" :class="{'player-zone': idx<4, 'enemy-zone': idx>=4, 'reachable': reachable.has(idx), 'hovered': hoveredZone===idx, 'shake': blockedShake===idx}" :data-zone-idx="idx" @dragover.prevent="onZoneDragOver($event, idx)" @dragleave="onZoneDragLeave" @drop="onDrop($event, idx)">
          <div class="zone-header">
            <div class="zone-index">{{ idx }}</div>
            <div class="zone-title">{{ zone }}</div>
          </div>
          <div v-if="blockedZone===idx" class="blocked-overlay" :class="{ shake: blockedShake===idx }">You have already played this round</div>
          <div :class="zoneClass(idx)" />
          <div class="zone-cards">
            <div v-for="g in cardsByZone(idx)" :key="g.id" class="card-wrap" :draggable="g.ownerId===state.activePlayerId" @dragstart="onDragStart($event,g.id)">
              <CardItem :card="g.card" :hidden="g.hidden && g.ownerId !== state.activePlayerId" />
            </div>
          </div>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue'
import CardItem from '../components/CardItem.vue'
import engine from '../game/engineInstance'
import { ZONES } from '../game/GameEngine'

export default {
  name: 'BoardView',
  components: { CardItem },
  setup() {
    const zones = ZONES
    const state = ref(engine.getState())
    let timer = null

    const dragged = ref(null) // { id, pos, vel }
    const reachable = ref(new Set())
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

    function cardsByZone(idx) {
      return engine.cardsInPlay.filter(g => g.position === idx)
    }

    function onDragStart(evt, cardId) {
      const g = engine.cardsInPlay.find(x => x.id === cardId)
      if (!g) return
      dragged.value = { id: cardId, pos: g.position, vel: g.card.velocity ?? 0 }
      computeReachable()
      evt.dataTransfer.setData('text/plain', cardId)
      evt.dataTransfer.effectAllowed = 'move'
    }

    function onZoneDragOver(evt, idx) {
      // show hovered zone and allow drop only if reachable
      hoveredZone.value = idx
      blockedZone.value = -1
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
          const all = new Set()
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

    function onDrop(evt, targetZone) {
      const payload = evt.dataTransfer.getData('text/plain')
      if (!payload) return

      // hand drag format: hand:<playerId>:<handIndex>
      if (payload.startsWith('hand:')) {
        const parts = payload.split(':')
        if (parts.length < 3) return alert('invalid hand payload')
        const playerId = Number(parts[1])
        const handIndex = Number(parts[2])
        if (playerId !== state.value.activePlayerId) return alert('not your hand')
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
      const g = engine.cardsInPlay.find(x => x.id === cardId)
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

    function zoneClass(idx) {
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
    onUnmounted(() => { clearInterval(timer) })

    return { zones, state, refresh, cardsByZone, onDragStart, onZoneDragOver, onZoneDragLeave, onDrop, reachable, hoveredZone }
  }
}
</script>

<style scoped>
.board.grid { display:grid; grid-template-columns: repeat(4, 1fr); gap:12px; align-items:start; }
.zone { min-height:260px; border-radius:8px; padding:8px; background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(0,0,0,0.06)); box-shadow: 0 1px 0 rgba(0,0,0,0.06); border: 1px solid rgba(255,255,255,0.04) }
.zone-header { display:flex; gap:8px; align-items:center; margin-bottom:8px }
.zone-index { width:28px; height:28px; display:flex; align-items:center; justify-content:center; border-radius:50%; background: rgba(0,0,0,0.25); font-weight:700 }
.zone-title { font-weight:700 }
.player-zone { border-color: rgba(76,175,80,0.2) }
.enemy-zone { border-color: rgba(244,67,54,0.14) }
.zone-cards { display:flex; flex-direction:column; gap:8px }
.card-wrap[draggable="true"] { cursor:grab }

.zone.reachable { box-shadow: 0 0 0 4px rgba(76,175,80,0.08) inset; border-color: rgba(76,175,80,0.35); }
.zone.reachable.hovered { box-shadow: 0 0 12px rgba(76,175,80,0.25); transform: translateY(-3px); }
.zone.hovered { box-shadow: 0 0 12px rgba(0,0,0,0.12); }
.blocked-overlay { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; background: rgba(0,0,0,0.65); color:#fff; font-weight:700; border-radius:8px; z-index:10 }
.zone { position:relative }
.in-range { position:absolute; inset:0; border-radius:8px; pointer-events:none; z-index:2 }
.in-range.range-0 { box-shadow: inset 0 0 0 4px rgba(76,175,80,0.06); }
.in-range.range-1 { box-shadow: inset 0 0 0 6px rgba(76,175,80,0.09); }
.in-range.range-2 { box-shadow: inset 0 0 0 8px rgba(76,175,80,0.11); }
.in-range.range-3 { box-shadow: inset 0 0 0 10px rgba(76,175,80,0.14); }
.in-range.range-4 { box-shadow: inset 0 0 0 12px rgba(76,175,80,0.17); }
.in-range.range-5 { box-shadow: inset 0 0 0 14px rgba(76,175,80,0.20); }
.in-range.range-6 { box-shadow: inset 0 0 0 16px rgba(76,175,80,0.23); }
.in-range.range-7 { box-shadow: inset 0 0 0 18px rgba(76,175,80,0.26); }
.in-range.range-8 { box-shadow: inset 0 0 0 20px rgba(76,175,80,0.30); }

@keyframes shakeX {
  0% { transform: translateX(0) }
  20% { transform: translateX(-6px) }
  40% { transform: translateX(6px) }
  60% { transform: translateX(-4px) }
  80% { transform: translateX(4px) }
 100% { transform: translateX(0) }
}
.shake { animation: shakeX 0.6s cubic-bezier(.36,.07,.19,.97); }
</style>
