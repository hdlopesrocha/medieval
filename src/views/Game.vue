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

      <section>
        <h3>Market</h3>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <div v-for="(c, i) in state.market" :key="i" style="width:140px;border:1px solid #ccc;padding:8px;border-radius:6px;text-align:center">
            <CardItem :card="marketPlaceholder" :hidden="true" />
            <div style="margin-top:8px">Cost: <strong>{{ c.cost }}</strong></div>
            <ion-button size="small" @click="buy(i)">Buy</ion-button>
          </div>
        </div>
      </section>

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
                </template>
              </div>
            </div>
          </div>
        </div>
      </section>

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

    function buy(i) {
      const res = engine.buyCard(state.value.activePlayerId || 0, i)
      if (!res.ok) alert('Buy failed: ' + res.reason)
      state.value = engine.getState()
    }

    function zoneName(pos) {
      return ZONES[pos] ?? ''
    }

    const fileInput = ref(null)

    const marketPlaceholder = {
      imageUrl: '/images/card_back.jpg',
      title: 'Card Back',
      description: '',
      attackPoints: 0,
      defensePoints: 0,
      type: 'SOLDIER',
      hp: 10,
      velocity: 0,
      range: 0
    }

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
        const targets = state.value.cardsInPlay.filter(x => x.ownerId !== state.value.activePlayerId)
        if (!targets.length) return alert('no targets')
        const choices = targets.map((t, idx) => `${idx}: ${t.card.title} (pos ${t.position}, hp ${t.card.hp})`).join('\n')
        const sel = prompt(`Choose target:\n${choices}`, '0')
        if (sel == null) return
        const idx = Number(sel)
        if (!Number.isFinite(idx) || idx < 0 || idx >= targets.length) return alert('invalid target')
        const targetId = targets[idx].id
        const res = engine.attackCard(attackerId, targetId, state.value.activePlayerId || 0)
        if (!res.ok) return alert('Attack failed: ' + res.reason)
        state.value = engine.getState()
      }

      function convertCardUI(attackerId) {
        const attacker = state.value.cardsInPlay.find(x => x.id === attackerId)
        if (!attacker) return alert('attacker not found')
        const targets = state.value.cardsInPlay.filter(x => x.ownerId !== state.value.activePlayerId)
        if (!targets.length) return alert('no targets')
        const choices = targets.map((t, idx) => `${idx}: ${t.card.title} (pos ${t.position}, hp ${t.card.hp})`).join('\n')
        const sel = prompt(`Choose target to convert:\n${choices}`, '0')
        if (sel == null) return
        const idx = Number(sel)
        if (!Number.isFinite(idx) || idx < 0 || idx >= targets.length) return alert('invalid target')
        const targetId = targets[idx].id
        const res = engine.convertCard(attackerId, targetId, state.value.activePlayerId || 0)
        if (!res.ok) return alert('Convert failed: ' + res.reason)
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

    return { state, start, next, buy, zoneName, moveCardUI, attackCardUI, exportState, triggerImport, onFileChange, fileInput, marketPlaceholder, playFromHand, onHandDragStart, canConvert }
  }
}
</script>

<style scoped>
</style>
