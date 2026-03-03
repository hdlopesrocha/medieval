import CardItem from '../components/CardItem.vue'
import InspiraCard from '../components/InspiraCard.vue'
// import GameContext from '../models/GameContext' if needed
import deckService from '../services/deckService'
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { IonPage, IonContent, IonButton, IonButtons } from '@ionic/vue'
import { useRouter } from 'vue-router'
import engine from '../game/engineInstance'
import gameState from '../services/gameState'
import HorizontalScrollSlider from '../components/HorizontalScrollSlider.vue'

type JsonLike = Record<string, unknown>

type CardViewerProps = {
  cards?: unknown[] | null
  mode?: string
}

function cloneCard(card: unknown): JsonLike | null {
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
  components: { CardItem, InspiraCard, IonPage, IonContent, IonButton, IonButtons },
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
    engine.gameContext.ensureDeck()
    const currentDeck = engine.gameContext.getDeck()
    if (!currentDeck.length) {
      engine.gameContext.setDeck(deckService.createDeck())
    }

    const titleText = computed(() => (props.mode === 'hand' ? 'Hand' : 'Deck'))
    const handPlayerId = computed(() => viewerState.value.activePlayerId)
    // Assume localPlayerId is passed in or available in context
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
        activePlayerId: Number(wf.activePlayerId ?? 0),
        playerId: Number(ctx.playerId ?? 0),
        playedThisRound: Object.fromEntries(Object.entries(engine.gameWorkflow.actionByPlayer || {}).map(([k, v]) => [k, v === 'action-taken'])),
        gameOver: Boolean(wf.gameOver)
      }
    }

    const isLocalPlayersTurn = computed(() => {
      return Number(viewerState.value.playerId || 0) === Number(viewerState.value.activePlayerId || 0)
    })

    const cardsToShow = computed(() => {
      if (Array.isArray(props.cards) && props.cards.length) {
        return props.cards.map(cloneCard).filter(Boolean)
      }
      if (props.mode === 'hand') {
        const playerCards = gameState.getPlayerCards(handPlayerId.value)
        if (playerCards.length) return playerCards.map(cloneCard).filter(Boolean)
        return engine.gameContext.getDeck().slice(0, 5).map(cloneCard).filter(Boolean)
      }
      return engine.gameContext.getDeck().map(cloneCard).filter(Boolean)
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
      router.push('/table')
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
