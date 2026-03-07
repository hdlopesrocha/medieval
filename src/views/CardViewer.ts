import CardItem from '../components/CardItem.vue'
// import GameContext from '../models/GameContext' if needed
import deckService from '../services/deckService'
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { IonPage, IonContent, IonButton, IonButtons } from '@ionic/vue'
import { useRouter } from 'vue-router'
import engine from '../game/engineInstance'
import eventService from '../services/eventService'
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
    mode: String
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
      if (wf.activePlayerId !== localPlayerId.value) 
        return false
      return true
    })

    

    const isLocalPlayersTurn = computed(() => {
      tick.value
      return Number(localPlayerId.value) === Number(engine.gameWorkflow?.activePlayerId ?? 0)
    })

    const cardsToShow = computed((): Card[] => {
      tick.value
      console.debug('[CardViewer] computing cardsToShow')
 
      const mode = String(props.mode || 'deck')
      var hand = [];
      
      if (mode === 'hand') {
        return engine.getPlayerCards(engine.gameContext.playerId)
      }
      else {
        hand = engine.gameContext.deck
      }
      const result = hand.map(entry => {
          return engine.allCards.cards[entry]
      })
      console.log('Cards to show:', { mode, hand, result })
      return result // resolve ids to card objects; if already objects, pass through
      
    })

    function playFromHand(index: number) {
      const result: any = engine.playCard(engine.gameContext.playerId, index)
      if (!result) {
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
      console.log('[CardViewer] initial cardsToShow =>', cardsToShow.value) 
      const unsub = eventService.on('engine:stateChange', () => { 
        tick.value++; 
        console.log('[CardViewer] engine emitted update') 
      })  
      console.log('[CardViewer] engine.gameContext:', engine.gameContext)
      console.log('[CardViewer] engine.allCards.cards keys:', Object.keys(engine.allCards.cards))
      console.log('[CardViewer] engine.allCards:', engine.allCards, 'length=', Array.isArray(engine.allCards) ? engine.allCards.length : 'n/a')
      console.log('[CardViewer] props.mode:', props.mode, 'engine.gameContext.playerId:', engine.gameContext?.playerId)

      timer = setInterval(() => { tick.value++ }, 500)
      onUnmounted(() => { try { if (unsub) unsub() } catch (_) {} })
    })

    onUnmounted(() => {
      if (timer) clearInterval(timer)
    })

    return { titleText, cardsToShow, canPlayFromHand, playFromHand, goMain, goTable, goHand, goDeck, localPlayerId, activePlayerId: handPlayerId, isLocalPlayersTurn }
  }
}
