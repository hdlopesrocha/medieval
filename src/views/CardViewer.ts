import CardItem from '../components/CardItem.vue'
import { useGameStateService } from '../services/gameStateService'
import deckService from '../services/deckService'
import { computed } from 'vue'
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent } from '@ionic/vue'
import CurrentPlayerBoard from '../components/CurrentPlayerBoard.vue'

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
  components: { CardItem, IonPage, IonHeader, IonToolbar, IonTitle, IonContent, CurrentPlayerBoard },
  setup(props: CardViewerProps) {
    const gameState = useGameStateService()
    gameState.ensureDeck('game')
    const currentDeck = gameState.getDeck('game')
    if (!currentDeck.length) {
      gameState.setDeck(deckService.createDeck(), 'game')
    }

    const titleText = computed(() => (props.mode === 'hand' ? 'Hand' : 'Deck'))
    const cardsToShow = computed(() => {
      if (Array.isArray(props.cards) && props.cards.length) {
        return props.cards.map(cloneCard).filter(Boolean)
      }
      if (props.mode === 'hand') {
        const playerCards = gameState.getPlayerCards(0, 'game')
        if (playerCards.length) return playerCards.map(cloneCard).filter(Boolean)
        return gameState.getDeck('game').slice(0, 5).map(cloneCard).filter(Boolean)
      }
      return gameState.getDeck('game').map(cloneCard).filter(Boolean)
    })

    return { titleText, cardsToShow }
  }
}
