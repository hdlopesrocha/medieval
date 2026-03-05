import { ref, computed, onMounted, onUnmounted } from 'vue'
import { IonPage, IonContent, IonButton, IonPopover } from '@ionic/vue'
import engine from '../game/engineInstance'
import eventService from '../services/eventService'
import { ZONES, ZONE_ELEMENTS } from '../game/GameEngine'
import CardItem from '../components/CardItem.vue'
import MiniCardItem from '../components/MiniCardItem.vue'
import ConfirmActionModal from '../components/ConfirmActionModal.vue'
import type { GameContext } from '../models/GameContext'
import type { GameWorkflowState } from '../models/GameWorkflowState'

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
  components: { IonPage, IonContent, IonButton, IonPopover, CardItem, MiniCardItem, ConfirmActionModal },
  setup() {
    // Use engine state directly; `tick` forces recompute in computed getters.
    const tick = ref(0)
    const state = computed(() => {
      tick.value
      const wf = engine.gameWorkflow
      const ctx = engine.gameContext
      const aggregatedCards = (Array.isArray(engine.players) ? engine.players : []).reduce((acc: any[], p: any) => {
        const ownerId = Number(p.id)
        const entries = Array.isArray(p.cardsInPlay) ? p.cardsInPlay : []
        for (const entry of entries) {
          const cid = Number((entry as any)?.cardId ?? (entry as any)?.id ?? NaN)
          if (!Number.isFinite(cid)) continue
          const pos = Number((entry as any)?.position ?? 0)
          const cardInst = engine.allCards[String(cid)] || null
          acc.push({ id: String(cid), ownerId, position: Number(pos ?? (cardInst as any)?.position ?? 0), hidden: Boolean((entry as any)?.hidden ?? (cardInst as any)?.hidden), card: cardInst })
        }
        return acc
      }, [])
      const nextState: any = {
        activePlayerId: Number(wf.activePlayerId || 0),
        playerId: Number(ctx.playerId ?? wf.activePlayerId ?? 0),
        round: Number(wf.round ?? 0),
        players: engine.players,
        cardsInPlay: aggregatedCards
      }
      return nextState
    })
    const selectedEntry = ref<any | null>(null)
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

    function onConfirm() { if (confirmResolver) confirmResolver(true) }
    function onCancel() { if (confirmResolver) confirmResolver(false) }

    const popoverOpen = ref(false)

    function selectCard(entry: any) {
      selectedEntry.value = entry || null
      if (entry) popoverOpen.value = true
    }

    function onPopoverDismiss() {
      popoverOpen.value = false
      selectedEntry.value = null
    }

    const selectedCard = computed(() => selectedEntry.value?.card || null)
    const selectedCardId = computed(() => String(selectedEntry.value?.id || ''))
    const selectedCardPosition = computed(() => Number(selectedEntry.value?.position ?? -1))
    const selectedCanAct = computed(() => {
      if (!selectedEntry.value) return false
      if (state.value.gameOver) return false
      return Number(selectedEntry.value.ownerId) === Number(state.value.activePlayerId)
    })

    const isLocalPlayersTurn = computed(() => {
      tick.value
      return Number(state.value.playerId || 0) === Number(state.value.activePlayerId || 0)
    })

    function refreshState() {
      // Bump tick to force computed readers to refresh.
      tick.value++
      if (selectedCardId.value) {
        const latest = (state.value.cardsInPlay || []).find((entry) => String(entry.id) === selectedCardId.value) || null
        selectedEntry.value = latest
      }
    }

    const cardsInPlayCount = computed(() => {
      let sum = 0
      for (const p of (engine.players || [])) {
        sum += Array.isArray(p.cardsInPlay) ? p.cardsInPlay.length : 0
      }
      return sum
    })

    const cardsByZone = computed(() => {
      const grouped: Record<number, any[]> = {}
      for (let index = 0; index < ZONE_COUNT; index++) grouped[index] = []
      const players = Array.isArray(engine.players) ? engine.players : []
      for (const p of players) {
        const ownerId = Number(p.id)
        const entries = Array.isArray(p.cardsInPlay) ? p.cardsInPlay : []
        for (const entry of entries) {
          const cid = Number((entry as any)?.cardId ?? (entry as any)?.id ?? NaN)
          if (!Number.isFinite(cid)) continue
          const pos = Number((entry as any)?.position ?? 0)
          if (!Number.isInteger(pos) || pos < 0 || pos >= ZONE_COUNT) continue
          const cardInst = engine.allCards[String(cid)] || null
          grouped[pos].push({ id: String(cid), ownerId, position: Number(pos), hidden: Boolean((entry as any)?.hidden ?? (cardInst as any)?.hidden), card: cardInst })
        }
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

    function visibleCountForZone(zoneIndex: number) {
      const total = (cardsByZone.value[zoneIndex] || []).length
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

    function closeDialog() {
      selectedEntry.value = null
    }

    function zoneName(position: number) {
      return ZONES[position] ?? String(position)
    }

    function canConvert(attacker: any | undefined | null) {
      return false
    }

    
    async function moveSelectedCard() {
      refreshState()
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
      try { if (unsub) unsub() } catch (_) {}
    })

    return {
      mapStripImages,
      state,
      isLocalPlayersTurn,
      cardsInPlayCount,
      selectedEntry,
      confirmVisible,
      confirmTitle,
      confirmMessage,
      onConfirm,
      onCancel,
      selectedCard,
      selectedCanAct,
      selectedCardPosition,
      cardsForZone,
      hiddenCountForZone,
      zoneStackStyle,
      zoneName,
      canConvert,
      moveSelectedCard,
      attackWithSelectedCard,
      convertWithSelectedCard,
      useSelectedAbility,
      closeDialog,
      popoverOpen,
      onPopoverDismiss,
      zoneStyle,
      refreshState,
      selectCard
    }
  }
}
