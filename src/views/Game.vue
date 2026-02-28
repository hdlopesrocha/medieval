<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Game</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div style="display:flex;gap:12px;margin-bottom:12px">
        <ion-button @click="start">Start Game</ion-button>
        <ion-button @click="next">Next Phase</ion-button>
        <ion-button @click="endTurn">End Turn</ion-button>
        <ion-button @click="exportState">Export State</ion-button>
        <ion-button @click="triggerImport">Import State</ion-button>
        <input type="file" accept=".json" style="display:none" @change="onFileChange" ref="fileInput" />
      </div>

      <!-- Market removed -->

      <section style="margin-top:16px">
        <h3>Table (cards in play)</h3>
        <div v-if="state.cardsInPlay.length === 0">No cards in play</div>
        <div v-else style="display:flex;flex-wrap:wrap;gap:8px">
          <div v-for="g in state.cardsInPlay" :key="g.id" style="border:1px solid #ddd;padding:8px;border-radius:6px;min-width:200px;display:flex;gap:8px;align-items:flex-start">
            <CardItem :card="g.card" :hidden="g.hidden && g.ownerId !== state.activePlayerId" />
            <div style="flex:1">
              <div><strong>Owner:</strong> {{ g.ownerId === state.activePlayerId ? 'Active' : (g.ownerId === 0 ? 'You' : 'Enemy') }}</div>
              <div><strong>Pos:</strong> {{ g.position }} ({{ zoneName(g.position) }})</div>
              <div><strong>HP:</strong> {{ (g.ownerId === state.activePlayerId || !g.hidden) ? g.card.hp : '??' }}</div>
              <div style="margin-top:8px">
                <template v-if="g.ownerId === state.activePlayerId">
                  <ion-button size="small" @click="moveCardUI(g.id)">Move</ion-button>
                  <ion-button size="small" @click="attackCardUI(g.id)">Attack</ion-button>
                  <ion-button size="small" v-if="g.card && g.card.type === 'PRIEST' && canConvert(g)" @click="convertCardUI(g.id)">Convert</ion-button>
                  <ion-button size="small" @click="openAbilitySelector(g.id)">Use</ion-button>
                  <ion-button size="small" fill="clear" @click="useAbilityNoTarget(g.id)">Use (no target)</ion-button>
                </template>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Selection overlay for choosing targets -->
      <div v-if="selection.mode" class="selection-overlay">
        <div class="selection-box">
          <h3>Select target</h3>
          <div class="candidates">
            <div v-for="c in selection.candidates" :key="c.id" class="candidate">
              <CardItem :card="c.card" :hidden="c.hidden && c.ownerId !== state.activePlayerId" />
              <div style="display:flex;gap:8px;align-items:center;margin-top:6px">
                <div style="flex:1">{{ c.card.title }} (pos {{ c.position }}, hp {{ c.card.hp }})</div>
                <ion-button size="small" @click="selectTarget(c.id)">Select</ion-button>
              </div>
            </div>
          </div>
          <div style="margin-top:8px;text-align:right">
            <ion-button fill="clear" @click="cancelSelection">Cancel</ion-button>
          </div>
        </div>
      </div>

      <section style="margin-top:16px">
        <h3>Hands</h3>
        <div v-for="p in state.players" :key="p.id" style="margin-bottom:12px">
            <div v-if="p.id === state.activePlayerId">
            <div style="font-weight:700">Your Hand ({{ (state.hands && state.hands[p.id]) ? state.hands[p.id].length : 0 }})</div>
            <div v-if="state.playedThisRound && state.playedThisRound[state.activePlayerId]" style="color:#666;margin-top:6px">You have played this round</div>
            <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px">
              <div v-for="(c, idx) in (state.hands && state.hands[p.id]) || []" :key="idx" style="min-width:200px; display:flex; flex-direction:column; gap:6px" :draggable="!state.playedThisRound || !state.playedThisRound[state.activePlayerId]" @dragstart.prevent="onHandDragStart($event, idx, c)">
                <CardItem :card="c" />
                <div style="display:flex;gap:6px;justify-content:flex-end">
                  <ion-button size="small" @click="playFromHand(idx)" :disabled="state.playedThisRound && state.playedThisRound[state.activePlayerId]">Play</ion-button>
                </div>
              </div>
            </div>
          </div>
          <div v-else>
            <div style="font-weight:700">{{ p.name }} hand: {{ (state.hands && state.hands[p.id] && state.hands[p.id].count) ? state.hands[p.id].count : (state.hands && state.hands[p.id] ? state.hands[p.id].length : 0) }}</div>
          </div>
        </div>
      </section>
    </ion-content>
  </ion-page>
</template>

<script>
import { ref } from 'vue'
import engine from '../game/engineInstance'
import CardItem from '../components/CardItem.vue'
import { ZONES } from '../game/GameEngine'

export default {
  name: 'GameView',
  components: { CardItem },
  setup() {
    const state = ref(engine.getState())

    function canConvert(attacker) {
      if (!attacker || !attacker.card) return false
      const range = attacker.card.range || 0
      const enemies = (state.value.cardsInPlay || []).filter(c => c.ownerId !== state.value.activePlayerId)
      return enemies.some(e => Math.abs(e.position - attacker.position) <= range)
    }

    function start() {
      engine.startGame(['You', 'Enemy'])
      state.value = engine.getState()
    }

    function next() {
      engine.nextPhase()
      state.value = engine.getState()
    }

    // buy removed (market phase removed)

    function zoneName(pos) {
      return ZONES[pos] ?? ''
    }

    const fileInput = ref(null)


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

    async function onFileChange(ev) {
      try {
        const f = ev.target.files && ev.target.files[0]
        if (!f) return
        const txt = await f.text()
        const obj = JSON.parse(txt)
        const res = engine.importState(obj)
        if (!res.ok) return alert('Import failed: ' + res.reason)
        state.value = engine.getState()
        alert('Import successful')
      } catch (e) {
        alert('Invalid file: ' + e)
      } finally {
        ev.target.value = null
      }
    }

    function moveCardUI(cardId) {
        const g = state.value.cardsInPlay.find(x => x.id === cardId)
        if (!g) return alert('card not found')
        const max = g.card.velocity ?? 0
        const input = prompt(`Enter steps to move (0..${max})`, String(max))
        if (input == null) return
        const steps = Number(input)
      const res = engine.moveCard(cardId, state.value.activePlayerId || 0, steps)
        if (!res.ok) return alert('Move failed: ' + res.reason)
        state.value = engine.getState()
      }

      function attackCardUI(attackerId) {
        const attacker = state.value.cardsInPlay.find(x => x.id === attackerId)
        if (!attacker) return alert('attacker not found')
          // open target selector for attack
          const targets = state.value.cardsInPlay.filter(x => x.ownerId !== state.value.activePlayerId)
          if (!targets.length) return alert('no targets')
          selection.value.mode = 'attack'
          selection.value.sourceId = attackerId
          selection.value.candidates = targets
      }

      function convertCardUI(attackerId) {
        const attacker = state.value.cardsInPlay.find(x => x.id === attackerId)
        if (!attacker) return alert('attacker not found')
          // open target selector for convert
            const targets = state.value.cardsInPlay.filter(x => x.ownerId !== state.value.activePlayerId)
            if (!targets.length) return alert('no targets')
            selection.value.mode = 'convert'
            selection.value.sourceId = attackerId
            selection.value.candidates = targets
      }

      // Selection UI state and helpers
      const selection = ref({ mode: null, sourceId: null, candidates: [] })

      function cancelSelection() {
        selection.value.mode = null
        selection.value.sourceId = null
        selection.value.candidates = []
      }

      async function selectTarget(targetId) {
        const playerId = state.value.activePlayerId || 0
        try {
          if (selection.value.mode === 'attack') {
            const res = engine.attackCard(selection.value.sourceId, targetId, playerId)
            if (!res.ok) return alert('Attack failed: ' + res.reason)
          } else if (selection.value.mode === 'convert') {
            const res = engine.convertCard(selection.value.sourceId, targetId, playerId)
            if (!res.ok) return alert('Convert failed: ' + res.reason)
          } else if (selection.value.mode === 'ability') {
            const res = engine.useCardAbility(selection.value.sourceId, playerId, targetId)
            if (!res.ok) return alert('Ability failed: ' + res.reason)
          }
        } finally {
          cancelSelection()
          state.value = engine.getState()
        }
      }

      function openAbilitySelector(cardId) {
        selection.value.mode = 'ability'
        selection.value.sourceId = cardId
        selection.value.candidates = state.value.cardsInPlay || []
      }

      function useAbilityNoTarget(cardId) {
        const playerId = state.value.activePlayerId || 0
        const res = engine.useCardAbility(cardId, playerId)
        if (!res.ok) return alert('Ability failed: ' + res.reason)
        state.value = engine.getState()
      }

    function endTurn() {
      const res = engine.endTurn()
      if (!res.ok) return alert('End turn failed: ' + res.reason)
      state.value = engine.getState()
    }

    function playFromHand(idx) {
      const playerId = state.value.activePlayerId || 0
      const res = engine.playCard(playerId, idx)
      if (!res.ok) return alert('Play failed: ' + res.reason)
      state.value = engine.getState()
    }

    function onHandDragStart(evt, handIndex, card) {
      const playerId = state.value.activePlayerId || 0
      // encode hand drag as hand:<playerId>:<handIndex>:<velocity>
      const vel = (card && card.velocity) ? card.velocity : 0
      evt.dataTransfer.setData('text/plain', `hand:${playerId}:${handIndex}:${vel}`)
      evt.dataTransfer.effectAllowed = 'copy'
    }

    return { state, start, next, zoneName, moveCardUI, attackCardUI, exportState, triggerImport, onFileChange, fileInput, playFromHand, onHandDragStart, canConvert, selection, selectTarget, cancelSelection, openAbilitySelector, useAbilityNoTarget }
  }
}
</script>

<style scoped>
.selection-overlay { position: fixed; inset: 0; display:flex; align-items:center; justify-content:center; background: rgba(0,0,0,0.45); z-index: 2000 }
.selection-box { background: #fff; padding: 16px; border-radius: 8px; width: min(960px, 92%); max-height: 80vh; overflow:auto }
.candidates { display:flex; flex-wrap:wrap; gap:12px }
.candidate { min-width:220px; border:1px solid #eee; padding:8px; border-radius:6px; background:#fafafa }
</style>
