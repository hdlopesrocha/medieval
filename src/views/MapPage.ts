import { ref, computed, onMounted, onUnmounted } from 'vue'
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButton } from '@ionic/vue'
import engine from '../game/engineInstance'
import CardItem from '../components/CardItem.vue'
import MiniCardItem from '../components/MiniCardItem.vue'
import CurrentPlayerBoard from '../components/CurrentPlayerBoard.vue'
import { createEmptyGameStateView } from '../models/GameStateView'
import type { GameStateView, InPlayCardView, PlayerView } from '../models/GameStateView'

const ZONE_COUNT = 8
const PANEL_ZONE_COUNT = 4
const MAX_ZONE_VISIBLE_CARDS = 4
const mapImage = new URL('../assets/map.png', import.meta.url).href

export default {
  name: 'MapPage',
  components: { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, CardItem, MiniCardItem, CurrentPlayerBoard },
  setup() {
    const state = ref<GameStateView>(createEmptyGameStateView())
    const selectedCard = ref<InPlayCardView['card'] | null>(null)
    let timer: ReturnType<typeof setInterval> | null = null

    function selectCard(entry: InPlayCardView) {
      selectedCard.value = entry?.card || null
    }

    function refreshState() {
      const rawState = (engine.getState() || {}) as Record<string, any>
      const nextState: GameStateView = {
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
      state.value = nextState
    }

    const cardsInPlayCount = computed(() => (state.value.cardsInPlay || []).length)

    const cardsByZone = computed(() => {
      const grouped: Record<number, InPlayCardView[]> = {}
      for (let index = 0; index < ZONE_COUNT; index++) grouped[index] = []
      for (const card of (state.value.cardsInPlay || [])) {
        const activePlayerId = Number(state.value.activePlayerId || 0)
        const originalPos = Number(card.position)
        const pos = Number(card.ownerId) === activePlayerId
          ? originalPos
          : mirrorZone(originalPos)
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

    function leftPanelZone(localIndex: number) {
      return localIndex
    }

    function rightPanelZone(localIndex: number) {
      return PANEL_ZONE_COUNT + localIndex
    }

    function mirrorZone(zoneIndex: number) {
      return (ZONE_COUNT - 1) - zoneIndex
    }

    function zoneStyle(zoneIndex: number) {
      return {
        left: `${(zoneIndex * 100) / PANEL_ZONE_COUNT}%`,
        width: `${100 / PANEL_ZONE_COUNT}%`
      }
    }

    onMounted(() => {
      refreshState()
      timer = setInterval(refreshState, 500)
    })

    onUnmounted(() => {
      if (timer) clearInterval(timer)
    })

    return {
      mapImage,
      state,
      cardsInPlayCount,
      selectedCard,
      cardsForZone,
      hiddenCountForZone,
      leftPanelZone,
      rightPanelZone,
      mirrorZone,
      zoneStyle,
      refreshState,
      selectCard
    }
  }
}
