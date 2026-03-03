import { ref, computed, onMounted, onUnmounted } from 'vue'
import { IonPage, IonContent, IonButton } from '@ionic/vue'
import engine from '../game/engineInstance'
import { ZONES, ZONE_ELEMENTS } from '../game/GameEngine'
import CardItem from '../components/CardItem.vue'
import MiniCardItem from '../components/MiniCardItem.vue'
import { createEmptyGameStateView } from '../models/GameStateView'
import type { GameStateView, InPlayCardView, PlayerView } from '../models/GameStateView'

const ZONE_COUNT = 8
const MAX_ZONE_VISIBLE_CARDS = 4
const MINI_CARD_FIXED_HEIGHT = 58
const ZONE_STACK_GAP = 2
const ZONE_STACK_PADDING = 4
const p0 = new URL('../assets/p0.jpg', import.meta.url).href
const p1 = new URL('../assets/p1.jpg', import.meta.url).href
const p2 = new URL('../assets/p2.jpg', import.meta.url).href
const p3 = new URL('../assets/p3.jpg', import.meta.url).href
const mapStripImages = [
  { src: p0, flipped: false },
  { src: p1, flipped: false },
  { src: p2, flipped: false },
  { src: p3, flipped: false },
  { src: p3, flipped: true },
  { src: p2, flipped: true },
  { src: p1, flipped: true },
  { src: p0, flipped: true }
]

export default {
  name: 'MapPage',
  components: { IonPage, IonContent, IonButton, CardItem, MiniCardItem },
  setup() {
    const anyEngine = engine as any
    // Use engine state directly; `tick` forces recompute in computed getters.
    const tick = ref(0)
    const state = computed<GameStateView>(() => { tick.value; return ((): GameStateView => {
      const rawState = (engine.getState() || {}) as Record<string, any>
      const nextState: GameStateView = {
        ...createEmptyGameStateView(),
        ...rawState,
        activePlayerId: Number(rawState.activePlayerId || 0),
        playerId: Number(rawState.playerId ?? rawState.activePlayerId ?? 0),
        round: Number(rawState.round ?? 0),
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
      return nextState
    })() })
    const selectedEntry = ref<InPlayCardView | null>(null)
    let timer: ReturnType<typeof setInterval> | null = null

    function selectCard(entry: InPlayCardView) {
      selectedEntry.value = entry || null
    }

    const selectedCard = computed(() => selectedEntry.value?.card || null)
    const selectedCardId = computed(() => String(selectedEntry.value?.id || ''))
    const selectedCardPosition = computed(() => Number(selectedEntry.value?.position ?? -1))
    const selectedCanAct = computed(() => {
      if (!selectedEntry.value) return false
      if (state.value.gameOver) return false
      return Number(selectedEntry.value.ownerId) === Number(state.value.activePlayerId)
    })

    function refreshState() {
      // Bump tick to force computed readers to refresh and touch engine state.
      tick.value++
      try { engine.getState() } catch (e) {}
      if (selectedCardId.value) {
        const latest = (state.value.cardsInPlay || []).find((entry) => String(entry.id) === selectedCardId.value) || null
        selectedEntry.value = latest
      }
    }

    const cardsInPlayCount = computed(() => (state.value.cardsInPlay || []).length)

    const cardsByZone = computed(() => {
      const grouped: Record<number, InPlayCardView[]> = {}
      for (let index = 0; index < ZONE_COUNT; index++) grouped[index] = []
      for (const card of (state.value.cardsInPlay || [])) {
        const pos = Number(card.position)
        if (Number.isInteger(pos) && pos >= 0 && pos < ZONE_COUNT) grouped[pos].push(card)
      }
      return grouped
    })

    function cardsForZone(zoneIndex: number) {
      return (cardsByZone.value[zoneIndex] || []).slice(0, MAX_ZONE_VISIBLE_CARDS)
    }

    function hiddenCountForZone(zoneIndex: number) {
      const total = (cardsByZone.value[zoneIndex] || []).length
      return Math.max(0, total - MAX_ZONE_VISIBLE_CARDS)
    }

    function visibleCountForZone(zoneIndex: number) {
      const total = (cardsByZone.value[zoneIndex] || []).length
      return Math.max(0, Math.min(MAX_ZONE_VISIBLE_CARDS, total))
    }

    function zoneStyle(zoneIndex: number) {
      return {
        left: `${(zoneIndex * 100) / ZONE_COUNT}%`,
        width: `${100 / ZONE_COUNT}%`
      }
    }

    function zoneStackStyle(zoneIndex: number) {
      const count = Math.max(1, visibleCountForZone(zoneIndex))
      const height = (count * MINI_CARD_FIXED_HEIGHT) + ((count - 1) * ZONE_STACK_GAP) + ZONE_STACK_PADDING
      return {
        height: `${height}px`
      }
    }

    function closeDialog() {
      selectedEntry.value = null
    }

    function zoneName(position: number) {
      return ZONES[position] ?? String(position)
    }

    function canConvert(attacker: InPlayCardView | undefined | null) {
      if (!attacker || !attacker.card) return false
      const range = Number(attacker.card.range || 0)
      const targets = state.value.cardsInPlay.filter((card) => card.ownerId !== state.value.activePlayerId)
      return targets.some((target) => Math.abs(Number(target.position) - Number(attacker.position)) <= range)
    }

    function chooseEnemyTarget(modeLabel: string) {
      const targets = state.value.cardsInPlay.filter((entry) => entry.ownerId !== state.value.activePlayerId)
      if (!targets.length) {
        alert('no targets')
        return ''
      }
      const options = targets.map((entry) => `${entry.id} :: ${String(entry.card?.title || 'unknown')} (pos ${entry.position})`).join('\n')
      const picked = window.prompt(`${modeLabel} target id:\n${options}`, String(targets[0].id || ''))
      if (!picked) return ''
      const id = String(picked).trim()
      const exists = targets.some((entry) => String(entry.id) === id)
      return exists ? id : ''
    }

    function moveSelectedCard() {
      if (!selectedEntry.value || !selectedCanAct.value) return
      const card = selectedEntry.value
      const velocity = Number(card.card?.velocity ?? 0)
      if (!Number.isFinite(velocity) || velocity <= 0) return alert('Move failed: card has no velocity')

      const playerId = Number(state.value.activePlayerId || 0)
      const isWaterUnit = String(card.card?.element || 'earth') === 'water'
      let maxSteps = velocity

      if (isWaterUnit) {
        const direction = playerId === 0 ? 1 : -1
        let maxWaterSteps = 0
        for (let index = 1; index <= velocity; index++) {
          const nextZone = Number(card.position) + (direction * index)
          if (nextZone < 0 || nextZone >= ZONE_ELEMENTS.length) break
          if (ZONE_ELEMENTS[nextZone] !== 'water') break
          maxWaterSteps = index
        }
        if (maxWaterSteps <= 0) return alert('Move failed: no reachable water zone for this boat')
        maxSteps = maxWaterSteps
      }

      const raw = window.prompt(`Move steps (0 to ${maxSteps})`, String(maxSteps))
      if (raw == null) return
      let steps = Number(raw)
      if (!Number.isFinite(steps)) steps = 0
      steps = Math.max(0, Math.min(maxSteps, Math.trunc(steps)))
      const result: any = engine.moveCard(String(card.id), playerId, steps)
      if (!result?.ok) return alert('Move failed: ' + String(result?.reason || 'invalid action'))
      refreshState()
    }

    function attackWithSelectedCard() {
      if (!selectedEntry.value || !selectedCanAct.value) return
      const playerId = Number(state.value.activePlayerId || 0)
      const targetId = chooseEnemyTarget('Attack')
      if (!targetId) return
      const result: any = engine.attackCard(String(selectedEntry.value.id), targetId, playerId)
      if (!result?.ok) return alert('Attack failed: ' + String(result?.reason || 'invalid action'))
      refreshState()
    }

    function convertWithSelectedCard() {
      if (!selectedEntry.value || !selectedCanAct.value) return
      const playerId = Number(state.value.activePlayerId || 0)
      const targetId = chooseEnemyTarget('Convert')
      if (!targetId) return
      const result: any = engine.convertCard(String(selectedEntry.value.id), targetId, playerId)
      if (!result?.ok) return alert('Convert failed: ' + String(result?.reason || 'invalid action'))
      refreshState()
    }

    function useSelectedAbility() {
      if (!selectedEntry.value || !selectedCanAct.value) return
      const options = state.value.cardsInPlay
        .map((entry) => `${entry.id} :: ${String(entry.card?.title || 'unknown')} (owner ${entry.ownerId}, pos ${entry.position})`)
        .join('\n')
      const picked = window.prompt(`Use ability target id (leave empty for no target):\n${options}`, '')
      if (picked == null) return
      const targetId = String(picked || '').trim()
      const playerId = Number(state.value.activePlayerId || 0)
      const result: any = targetId
        ? anyEngine.useCardAbility(String(selectedEntry.value.id), playerId, targetId)
        : anyEngine.useCardAbility(String(selectedEntry.value.id), playerId)
      if (!result?.ok) return alert('Ability failed: ' + String(result?.reason || 'invalid action'))
      refreshState()
    }

    onMounted(() => {
      refreshState()
      timer = setInterval(refreshState, 500)
    })

    onUnmounted(() => {
      if (timer) clearInterval(timer)
    })

    return {
      mapStripImages,
      state,
      cardsInPlayCount,
      selectedEntry,
      selectedCard,
      selectedCanAct,
      selectedCardPosition,
      cardsForZone,
      hiddenCountForZone,
      zoneStackStyle,
      zoneName,
      canConvert,
      moveSelectedCard,
      attackWithSelectedCard,
      convertWithSelectedCard,
      useSelectedAbility,
      closeDialog,
      zoneStyle,
      refreshState,
      selectCard
    }
  }
}
