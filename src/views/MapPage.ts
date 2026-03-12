import { ref, computed, onMounted, onUnmounted } from 'vue'
import { IonPage, IonContent, IonButton, IonPopover, IonCard } from '@ionic/vue'
import engine from '../game/engineInstance'
import eventService from '../services/eventService'
import { ZONES, ZONE_ELEMENTS } from '../game/GameEngine'
import CardItem from '../components/CardItem.vue'
import MiniCardItem from '../components/MiniCardItem.vue'
import type { GameContext } from '../models/GameContext'
import type { GameWorkflowState } from '../models/GameWorkflowState'
import Card from '../models/Card'
import CardPosition from '../models/CardPosition'
import { Action } from '../models/Action'
import { car } from 'ionicons/icons'

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
  components: { IonPage, IonContent, IonButton, IonPopover, IonCard, CardItem, MiniCardItem },
  setup() {
    // Use engine directly; `tick` forces recompute in computed getters.
    const tick = ref(0)
    const selectedCard = ref<Card | null>(null)
    const selectedCardOwnerId = ref<number | null>(null)
    const movePopoverVisible = ref(false)
    const selectedMoveUnits = ref(0)
    const confirmVisible = ref(false)
    const confirmTitle = ref('')
    const confirmMessage = ref('')
    let confirmResolver: ((ok: boolean) => void) | null = null
    let timer: ReturnType<typeof setInterval> | null = null

    function askConfirm(title: string, message: string) {
      confirmTitle.value = title
      confirmMessage.value = message
      confirmVisible.value = true
      return new Promise<boolean>((resolve) => {
        confirmResolver = (ok: boolean) => {
          confirmVisible.value = false
          resolve(ok)
          confirmResolver = null
        }
      })
    }

    function onConfirm() { 
      if (confirmResolver) 
        confirmResolver(true) 
    }
    
    function onCancel() { 
      if (confirmResolver) 
        confirmResolver(false) 
    }
    function selectCard(entry: Card, ownerId: number) {
      console.log('Card selected', entry, 'ownerId:', ownerId)
      selectedCard.value = entry
      selectedCardOwnerId.value = ownerId
      tick.value++
    }

    function onPopoverDismiss() {
      console.log('Popover dismissed')
      selectedCard.value = null
      selectedCardOwnerId.value = null
      confirmVisible.value = false
      tick.value++
    }



    const isLocalPlayersTurn = computed(() => {
      tick.value
      return engine.gameContext.playerId === engine.gameWorkflow.activePlayerId
    })

    const isSelectedCardOwnedByLocalPlayer = computed(() => {
      tick.value
      return selectedCardOwnerId.value === engine.gameContext.playerId
    })

    function refreshState() {
      // Bump tick to force computed readers to refresh.
      tick.value++
    }

    const cardsByZone = computed(() : Record<number, Card[]> => {
      const grouped: Record<number, Card[]> = {}
      for (let index = 0; index < ZONE_COUNT; index++) {
        grouped[index] = []
      }

      for (const cardPosition of engine.gameContext.played) {
        const card = engine.allCards.cards[cardPosition.cardId]
        let cp = cardPosition.position
        if (cardPosition.ownerId !== engine.gameContext.playerId) {
          cp = 7 - cp
        }

        grouped[cp].push(card)
      }
      console.log('Cards grouped by zone:', grouped)
      return grouped
    })

    const cardsWithOwnerByZone = computed(() : Record<number, Array<{ card: Card; ownerId: number }>> => {
      const grouped: Record<number, Array<{ card: Card; ownerId: number }>> = {}
      for (let index = 0; index < ZONE_COUNT; index++) {
        grouped[index] = []
      }

      for (const cardPosition of engine.gameContext.played) {
        const card = engine.allCards.cards[cardPosition.cardId]
        let cp = cardPosition.position
        if (cardPosition.ownerId !== engine.gameContext.playerId) {
          cp = 7 - cp
        }

        grouped[cp].push({ card, ownerId: cardPosition.ownerId })
      }
      return grouped
    })

    function cardsForZone(zoneIndex: number): Card[] {
      return cardsByZone.value[zoneIndex] 
    }

    function cardsWithOwnerForZone(zoneIndex: number): Array<{ card: Card; ownerId: number }> {
      return cardsWithOwnerByZone.value[zoneIndex]
    }

    function hiddenCountForZone(zoneIndex: number) {
      const total = cardsByZone.value[zoneIndex].length
      return Math.max(0, total - MAX_ZONE_VISIBLE_CARDS)
    }

    function visibleCountForZone(zoneIndex: number) {
      const total = cardsByZone.value[zoneIndex].length
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

    function zoneName(position: number) {
      return ZONES[position] ?? String(position)
    }

    function canConvert(attacker: any | undefined | null) {
      return false
    }

    
    async function moveSelectedCard() {
      if (!selectedCard.value || selectedCardOwnerId.value === null) {
        return
      }
      // Show move popover with velocity-based range
      selectedMoveUnits.value = 0
      movePopoverVisible.value = true
    }

    function confirmMove() {
      if (!selectedCard.value || selectedCardOwnerId.value === null) {
        movePopoverVisible.value = false
        return
      }
      
      // Find the card position in played array
      const cardPosition = engine.gameContext.played.find(
        cp => cp.cardId === selectedCard.value!.id && cp.ownerId === selectedCardOwnerId.value
      )
      
      if (cardPosition) {
        const action = new Action(cardPosition, selectedMoveUnits.value)
        console.log('Move action created:', action)
        // TODO: Execute the move action through the game engine
      }
      
      movePopoverVisible.value = false
      refreshState()
    }

    function cancelMove() {
      movePopoverVisible.value = false
    }

    function getMoveRange(): number[] {
      if (!selectedCard.value) {
        return []
      }
      const velocity = selectedCard.value.velocity
      const range: number[] = []
      for (let i = -velocity; i <= velocity; i++) {
        range.push(i)
      }
      return range
    }

    async function attackWithSelectedCard() {
      refreshState()
    }

    async function convertWithSelectedCard() {
     
      refreshState()
    }

    async function useSelectedAbility() {
      refreshState()
    }

    let unsub: (() => void) | null = null
    onMounted(() => {
      refreshState()
      try { 
        unsub = eventService.on('engine:stateChange', () => { 
          refreshState(); 
          console.log('[MapPage] engine emitted update') 
        }) 
      } catch (e) { 
        unsub = null 
      }
    })

    onUnmounted(() => {
      if (unsub) {
        unsub()
      }
    })

    return {
      mapStripImages,
      isLocalPlayersTurn,
      isSelectedCardOwnedByLocalPlayer,
      selectedCard,
      movePopoverVisible,
      selectedMoveUnits,
      confirmVisible,
      confirmTitle,
      confirmMessage,
      onConfirm,
      onCancel,
      cardsForZone,
      cardsWithOwnerForZone,
      hiddenCountForZone,
      zoneStackStyle,
      zoneName,
      canConvert,
      moveSelectedCard,
      confirmMove,
      cancelMove,
      getMoveRange,
      attackWithSelectedCard,
      convertWithSelectedCard,
      useSelectedAbility,
      onPopoverDismiss,
      zoneStyle,
      refreshState,
      selectCard
    }
  }
}
