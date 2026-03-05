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
    // Use engine gameContext and gameWorkflow directly
    const tick = ref(0)
    let timer: ReturnType<typeof setInterval> | null = null

    const titleText = computed(() => (props.mode === 'hand' ? 'Hand' : 'Deck'))
    const handPlayerId = computed(() => { tick.value; return Number(engine.gameWorkflow?.activePlayerId ?? 0) })
    // localPlayerId is the id assigned to this client/instance (owner)
    const localPlayerId = computed(() => { tick.value; return Number(engine.gameContext?.playerId ?? 0) })
    const canPlayFromHand = computed(() => {
      tick.value
      const wf: any = engine.gameWorkflow || {}
      if (wf.gameOver) return false
      // Only allow play if it's this player's turn and they haven't played yet
      if (Number(wf.activePlayerId ?? 0) !== Number(localPlayerId.value)) return false
      const playedMap = Object.fromEntries(Object.entries(wf.actionByPlayer || {}).map(([k, v]) => [k, v === 'action-taken']))
      return !playedMap[String(localPlayerId.value)]
    })

    

    const isLocalPlayersTurn = computed(() => {
      tick.value
      return Number(localPlayerId.value) === Number(engine.gameWorkflow?.activePlayerId ?? 0)
    })

    const cardsToShow = computed(() => {
      // If explicit cards were passed as a prop, show them
      if (Array.isArray(props.cards) && props.cards.length) return props.cards

      const mode = String(props.mode || 'deck')
      if (mode === 'hand') {
        const playerId = Number(localPlayerId.value || 0)
        return engine.getPlayerCards(playerId)
      }

      // deck mode: resolve deck entries (may be ids or card objects)
      const deckArr = Array.isArray(engine.deck) ? engine.deck : []
      const out: Card[] = []
      for (const item of deckArr) {
        try {
          if (!item) continue
          if (typeof item === 'object') {
            // already a card instance
            out.push(item as Card)
          } else {
            const resolved = (engine as any).cardsById?.[String(item)] || (engine.gameContext as any)?.cardsById?.[String(item)]
            if (resolved) out.push(resolved as Card)
          }
        } catch (_) {}
      }
      return out
    })

    function playFromHand(index: number) {
      if (!canPlayFromHand.value) return
      const playerId = Number(localPlayerId.value)
      const result: any = engine.playCard(playerId, Number(index || 0))
      if (!result?.ok) {
        alert('Play failed: ' + String(result?.reason || 'invalid action'))
      }
      tick.value++
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
      tick.value++
      timer = setInterval(() => { tick.value++ }, 500)
    })

    onUnmounted(() => {
      if (timer) clearInterval(timer)
    })

    return { titleText, cardsToShow, canPlayFromHand, playFromHand, goMain, goTable, goHand, goDeck, localPlayerId, activePlayerId: handPlayerId, isLocalPlayersTurn }
  }
}
