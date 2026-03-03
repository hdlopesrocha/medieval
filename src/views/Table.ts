import CardItem from '../components/CardItem.vue'
import { ref, computed, onMounted, onUnmounted } from 'vue'
import engine from '../game/engineInstance'
import { ZONES, ZONE_ELEMENTS } from '../game/GameEngine'
import { IonPage, IonContent, IonButton } from '@ionic/vue'
import { useRouter } from 'vue-router'
import { sortCardsInPlayBySlot } from '../utils/sortCardsInPlay'
import { createEmptyGameStateView } from '../models/GameStateView'
import type { GameStateView, InPlayCardView, PlayerView } from '../models/GameStateView'

export default {
  name: 'Table',
  components: { CardItem, IonPage, IonContent, IonButton },
  setup() {
    const router = useRouter()
    const anyEngine = engine as any
    // Use engine.getState(); `tick` drives reactivity for computed readers
    const tick = ref(0)
    const state = computed<GameStateView>(() => {
      tick.value
      const rawState = (engine.getState() || {}) as Record<string, any>
      const rawPlayers = Array.isArray(rawState.players) ? rawState.players : []
      const rawCards = Array.isArray(rawState.cardsInPlay) ? rawState.cardsInPlay : []
      return {
        ...createEmptyGameStateView(),
        ...rawState,
        activePlayerId: Number(rawState.activePlayerId || 0),
        playerId: Number(rawState.playerId ?? rawState.activePlayerId ?? 0),
        round: Number(rawState.round ?? 0),
        players: rawPlayers.map((player: any): PlayerView => ({
          ...player,
          id: Number(player.id)
        })),
        cardsInPlay: rawCards.map((entry: any): InPlayCardView => ({
          ...entry,
          ownerId: Number(entry.ownerId),
          position: Number(entry.position)
        }))
      }
    })
    const sortedCardsInPlay = computed(() => sortCardsInPlayBySlot(state.value?.cardsInPlay, state.value?.activePlayerId))
    let timer: ReturnType<typeof setInterval> | null = null
    function normalizedStateFromEngine(): GameStateView {
      const rawState = (engine.getState() || {}) as Record<string, any>
      return {
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
    }
    function refresh() { tick.value++; try { engine.getState() } catch (e) {} }
    function goMain() { router.push('/main') }

    function zoneName(position: number) {
      return ZONES[position] ?? String(position)
    }

    function canConvert(attacker: InPlayCardView | undefined | null) {
      if (!attacker || !attacker.card) return false
      const range = Number(attacker.card.range || 0)
      const targets = state.value.cardsInPlay.filter((card) => card.ownerId !== state.value.activePlayerId)
      return targets.some((target) => Math.abs(Number(target.position) - Number(attacker.position)) <= range)
    }

    function moveCardUI(cardId: string) {
      const card = state.value.cardsInPlay.find((entry) => entry.id === cardId)
      if (!card) return alert('card not found')
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
      const result = engine.moveCard(cardId, playerId, steps)
      if (!result?.ok) return alert('Move failed: ' + String((result as any)?.reason || 'invalid action'))
      refresh()
    }

    function chooseEnemyTarget(attackerId: string, modeLabel: string) {
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

    function attackCardUI(attackerId: string) {
      const playerId = Number(state.value.activePlayerId || 0)
      const targetId = chooseEnemyTarget(attackerId, 'Attack')
      if (!targetId) return
      const result = engine.attackCard(attackerId, targetId, playerId)
      if (!result?.ok) return alert('Attack failed: ' + String((result as any)?.reason || 'invalid action'))
      refresh()
    }

    function convertCardUI(attackerId: string) {
      const playerId = Number(state.value.activePlayerId || 0)
      const targetId = chooseEnemyTarget(attackerId, 'Convert')
      if (!targetId) return
      const result = engine.convertCard(attackerId, targetId, playerId)
      if (!result?.ok) return alert('Convert failed: ' + String((result as any)?.reason || 'invalid action'))
      refresh()
    }

    function openAbilitySelector(cardId: string) {
      const options = state.value.cardsInPlay
        .map((entry) => `${entry.id} :: ${String(entry.card?.title || 'unknown')} (owner ${entry.ownerId}, pos ${entry.position})`)
        .join('\n')
      const picked = window.prompt(`Use ability target id (leave empty for no target):\n${options}`, '')
      if (picked == null) return
      const targetId = String(picked || '').trim()
      const playerId = Number(state.value.activePlayerId || 0)
      const result = targetId
        ? anyEngine.useCardAbility(cardId, playerId, targetId)
        : anyEngine.useCardAbility(cardId, playerId)
        if (!result?.ok) return alert('Ability failed: ' + String((result as any)?.reason || 'invalid action'))
      refresh()
    }

    function useAbilityNoTarget(cardId: string) {
      const playerId = Number(state.value.activePlayerId || 0)
      const result = anyEngine.useCardAbility(cardId, playerId)
        if (!result?.ok) return alert('Ability failed: ' + String((result as any)?.reason || 'invalid action'))
      refresh()
    }

    function reshuffle() {
      engine.shuffleDeck()
      refresh()
    }

    onMounted(() => { timer = setInterval(refresh, 700) })
    onUnmounted(() => { if (timer) clearInterval(timer) })
    return {
      state,
      sortedCardsInPlay,
      refresh,
      goMain,
      zoneName,
      canConvert,
      moveCardUI,
      attackCardUI,
      convertCardUI,
      openAbilitySelector,
      useAbilityNoTarget,
      reshuffle
    }
  }
}
