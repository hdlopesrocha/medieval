import CardItem from '../components/CardItem.vue'
import { useGameStateService } from '../services/gameStateService'
import deckService from '../services/deckService'
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButton } from '@ionic/vue'
import { useRouter } from 'vue-router'
import CurrentPlayerBoard from '../components/CurrentPlayerBoard.vue'
import engine from '../game/engineInstance'

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
  components: { CardItem, IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, CurrentPlayerBoard },
  setup(props: CardViewerProps) {
    const router = useRouter()
    const gameState = useGameStateService()
    const viewerState = ref<{ activePlayerId: number, playedThisRound: Record<string, unknown>, gameOver: boolean }>({
      activePlayerId: 0,
      playedThisRound: {},
      gameOver: false
    })
    let timer: ReturnType<typeof setInterval> | null = null
    gameState.ensureDeck('game')
    const currentDeck = gameState.getDeck('game')
    if (!currentDeck.length) {
      gameState.setDeck(deckService.createDeck(), 'game')
    }

    const titleText = computed(() => (props.mode === 'hand' ? 'Hand' : 'Deck'))
    const isHandMode = computed(() => props.mode === 'hand')
    const handPlayerId = computed(() => Number(viewerState.value.activePlayerId || 0))
    const canPlayFromHand = computed(() => {
      if (!isHandMode.value) return false
      if (viewerState.value.gameOver) return false
      const playedMap = viewerState.value.playedThisRound || {}
      return !Boolean(playedMap[handPlayerId.value] ?? playedMap[String(handPlayerId.value)])
    })

    function refreshState() {
      const state = engine.getState() || {}
      viewerState.value = {
        activePlayerId: Number(state.activePlayerId || 0),
        playedThisRound: state.playedThisRound || {},
        gameOver: Boolean(state.gameOver)
      }
    }

    const cardsToShow = computed(() => {
      if (Array.isArray(props.cards) && props.cards.length) {
        return props.cards.map(cloneCard).filter(Boolean)
      }
      if (props.mode === 'hand') {
        const playerCards = gameState.getPlayerCards(handPlayerId.value, 'game')
        if (playerCards.length) return playerCards.map(cloneCard).filter(Boolean)
        return gameState.getDeck('game').slice(0, 5).map(cloneCard).filter(Boolean)
      }
      return gameState.getDeck('game').map(cloneCard).filter(Boolean)
    })

    function playFromHand(index: number) {
      if (!isHandMode.value) return
      if (!canPlayFromHand.value) return
      const playerId = handPlayerId.value
      const result = engine.playCard(playerId, Number(index || 0))
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

    return { titleText, isHandMode, cardsToShow, canPlayFromHand, playFromHand, goMain, goTable, goHand, goDeck }
  }
}
