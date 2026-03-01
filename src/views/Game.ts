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
