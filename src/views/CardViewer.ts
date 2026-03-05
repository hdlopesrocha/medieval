import CardItem from '../components/CardItem.vue'
// import GameContext from '../models/GameContext' if needed
import deckService from '../services/deckService'
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { IonPage, IonContent, IonButton, IonButtons } from '@ionic/vue'
import { useRouter } from 'vue-router'
import engine from '../game/engineInstance'
import HorizontalScrollSlider from '../components/HorizontalScrollSlider.vue'
import Card from 'src/models/Card'

type JsonLike = Record<string, unknown>

type CardViewerProps = {
  cards?: Card[] | null
  mode?: string
}

function cloneCard(card: Card): JsonLike | null {
  if (!card) return null
  if (typeof card === 'object' && card !== null && 'toJSON' in card && typeof (card as { toJSON?: () => unknown }).toJSON === 'function') {
    return JSON.parse(JSON.stringify((card as { toJSON: () => unknown }).toJSON())) as JsonLike
  }
  return JSON.parse(JSON.stringify(card)) as JsonLike
}

export default {
  name: 'CardViewer',
  props: {
    cards: {
      type: Array,
      default: null
    },
    mode: {
      type: String,
      default: 'deck'
    }
  },
  components: { CardItem, HorizontalScrollSlider, IonPage, IonContent, IonButton, IonButtons },
  setup(props: CardViewerProps) {
    const router = useRouter()
    // Replace with GameContext instance usage
    const viewerState = ref<{ playerId: number, activePlayerId: number, playedThisRound: Record<string, boolean>, gameOver: boolean }>({
      playerId: 0,
      activePlayerId: 0,
      playedThisRound: {},
      gameOver: false
    })
    let timer: ReturnType<typeof setInterval> | null = null

    const titleText = computed(() => (props.mode === 'hand' ? 'Hand' : 'Deck'))
    const handPlayerId = computed(() => viewerState.value.activePlayerId)
    // localPlayerId is the id assigned to this client/instance (owner)
    const localPlayerId = computed(() => viewerState.value.playerId)
    const canPlayFromHand = computed(() => {
      if (viewerState.value.gameOver) return false
      // Only allow play if it's this player's turn and they haven't played yet
      if (viewerState.value.activePlayerId !== localPlayerId.value) return false
      const playedMap = viewerState.value.playedThisRound
      return !playedMap[String(localPlayerId.value)]
    })

    function refreshState() {
      const wf: any = engine.gameWorkflow || {}
      const ctx: any = engine.gameContext || {}
      viewerState.value = {
        activePlayerId: wf.activePlayerId,
        playerId: ctx.playerId,
        playedThisRound: Object.fromEntries(Object.entries(engine.gameWorkflow.actionByPlayer || {}).map(([k, v]) => [k, v === 'action-taken'])),
        gameOver: Boolean(wf.gameOver)
      }
    }

    const isLocalPlayersTurn = computed(() => {
      return viewerState.value.playerId === viewerState.value.activePlayerId
    })

    const cardsToShow = computed(() => {
      console.log('Engine:', engine)
      return engine.deck
    })

    function playFromHand(index: number) {
      if (!canPlayFromHand.value) return
      const playerId = localPlayerId.value
      const result: any = engine.playCard(playerId, Number(index || 0))
      if (!result?.ok) {
        alert('Play failed: ' + String(result?.reason || 'invalid action'))
      }
      refreshState()
    }

    function goMain() {
      router.push('/main')
    }

    function goTable() {
      // Board and Table views have been removed; redirect to Map as the closest view
      router.push('/map')
    }

    function goHand() {
      router.push('/hand')
    }

    function goDeck() {
      router.push('/deck')
    }

    onMounted(() => {
      refreshState()
      timer = setInterval(refreshState, 500)
    })

    onUnmounted(() => {
      if (timer) clearInterval(timer)
    })

    return { titleText, cardsToShow, canPlayFromHand, playFromHand, goMain, goTable, goHand, goDeck, localPlayerId: localPlayerId.value, activePlayerId: handPlayerId.value, isLocalPlayersTurn: isLocalPlayersTurn.value }
  }
}
