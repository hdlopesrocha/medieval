import CardItem from '../components/CardItem.vue'
import CurrentPlayerBoard from '../components/CurrentPlayerBoard.vue'
import { ref, computed, onMounted, onUnmounted } from 'vue'
import engine from '../game/engineInstance'
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButton } from '@ionic/vue'
import { sortCardsInPlayBySlot } from '../utils/sortCardsInPlay'
import { createEmptyGameStateView } from '../models/GameStateView'
import type { GameStateView, InPlayCardView, PlayerView } from '../models/GameStateView'

export default {
  name: 'Table',
  components: { CardItem, CurrentPlayerBoard, IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButton },
  setup() {
    const state = ref<GameStateView>(createEmptyGameStateView())
    const sortedCardsInPlay = computed(() => sortCardsInPlayBySlot(state.value?.cardsInPlay, state.value?.activePlayerId))
    let timer: ReturnType<typeof setInterval> | null = null
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
    function refresh() { state.value = normalizedStateFromEngine() }
    onMounted(() => { timer = setInterval(refresh, 700) })
    onUnmounted(() => { if (timer) clearInterval(timer) })
    return { state, sortedCardsInPlay, refresh }
  }
}
