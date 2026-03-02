import { ref, computed } from 'vue'
import engine from '../game/engineInstance'
import CardItem from '../components/CardItem.vue'
import { ZONES } from '../game/GameEngine'
import { useGameStateService } from '../services/gameStateService'

export default {
  name: 'LocalPlayerPage',
  components: { CardItem },
  setup() {
    const anyEngine = engine as any
    const state = ref(engine.getState())
    const gameState = useGameStateService()

    const deckCards = gameState.getDeckRef('game')
    const activeHandCards = computed(() => gameState.getPlayerCards(state.value.activePlayerId || 0, 'game'))

    function playerHandCards(playerId: number) {
      return gameState.getPlayerCards(playerId, 'game')
    }

    function handCountByPlayer(playerId: number) {
      return playerHandCards(playerId).length
    }

    function canConvert(attacker: any) {
      if (!attacker || !attacker.card) return false
      const range = attacker.card.range || 0
      const enemies = (state.value.cardsInPlay || []).filter((c: any) => c.ownerId !== state.value.activePlayerId)
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

    function castleHp(playerId: number) {
      return Number((state.value as any).castleHpByPlayer?.[playerId] ?? 0)
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

    async function onFileChange(ev: any) {
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

    function moveCardUI(cardId: string) {
      const g = state.value.cardsInPlay.find((x: any) => x.id === cardId)
      if (!g) return alert('card not found')
      const max = g.card.velocity ?? 0
      const input = prompt(`Enter steps to move (0..${max})`, String(max))
      if (input == null) return
      const steps = Number(input)
      const res = engine.moveCard(cardId, state.value.activePlayerId || 0, steps)
      if (!res.ok) return alert('Move failed: ' + ((res as any).reason || 'invalid action'))
      state.value = engine.getState()
    }

    function attackCardUI(attackerId: string) {
      const attacker = state.value.cardsInPlay.find((x: any) => x.id === attackerId)
      if (!attacker) return alert('attacker not found')
      const targets = state.value.cardsInPlay.filter((x: any) => x.ownerId !== state.value.activePlayerId)
      if (!targets.length) return alert('no targets')
      selection.value.mode = 'attack'
      selection.value.sourceId = attackerId
      selection.value.candidates = targets
    }

    function defendCardUI(cardId: string) {
      const playerId = state.value.activePlayerId || 0
      const res = (engine as any).defendCard(cardId, playerId)
      if (!res.ok) return alert('Defend failed: ' + res.reason)
      state.value = engine.getState()
    }

    function convertCardUI(attackerId: string) {
      const attacker = state.value.cardsInPlay.find((x: any) => x.id === attackerId)
      if (!attacker) return alert('attacker not found')
      const targets = state.value.cardsInPlay.filter((x: any) => x.ownerId !== state.value.activePlayerId)
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
      try {
        if (selection.value.mode === 'attack') {
          const res = engine.attackCard(sourceId, targetId, playerId)
          if (!res.ok) return alert('Attack failed: ' + ((res as any).reason || 'invalid action'))
        } else if (selection.value.mode === 'convert') {
          const res = engine.convertCard(sourceId, targetId, playerId)
          if (!res.ok) return alert('Convert failed: ' + res.reason)
        } else if (selection.value.mode === 'ability') {
          const res = anyEngine.useCardAbility(sourceId, playerId, targetId)
          if (!res.ok) return alert('Ability failed: ' + res.reason)
        }
      } finally {
        cancelSelection()
        state.value = engine.getState()
      }
    }

    function openAbilitySelector(cardId: string) {
      selection.value.mode = 'ability'
      selection.value.sourceId = cardId
      selection.value.candidates = state.value.cardsInPlay || []
    }

    function useAbilityNoTarget(cardId: string) {
      const playerId = state.value.activePlayerId || 0
      const res = anyEngine.useCardAbility(cardId, playerId)
      if (!res.ok) return alert('Ability failed: ' + res.reason)
      state.value = engine.getState()
    }

    function endTurn() {
      const res = engine.endTurn()
      if (!res.ok) return alert('End turn failed: ' + res.reason)
      state.value = engine.getState()
    }

    function playFromHand(idx: number) {
      const playerId = state.value.activePlayerId || 0
      const res = engine.playCard(playerId, idx)
      if (!res.ok) return alert('Play failed: ' + ((res as any).reason || 'invalid action'))
      state.value = engine.getState()
    }

    function onHandDragStart(evt: any, handIndex: number, card: any) {
      const playerId = state.value.activePlayerId || 0
      const vel = (card && card.velocity) ? card.velocity : 0
      evt.dataTransfer.setData('text/plain', `hand:${playerId}:${handIndex}:${vel}`)
      evt.dataTransfer.effectAllowed = 'copy'
    }

    return {
      state,
      deckCards,
      activeHandCards,
      playerHandCards,
      handCountByPlayer,
      castleHp,
      start,
      next,
      zoneName,
      moveCardUI,
      attackCardUI,
      defendCardUI,
      exportState,
      triggerImport,
      onFileChange,
      fileInput,
      playFromHand,
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
