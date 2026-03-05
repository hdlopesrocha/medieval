import { ref, computed, onMounted, onUnmounted } from 'vue'
import { IonButton, IonIcon, IonPopover } from '@ionic/vue'
import ShareModal from './ShareModal.vue'
import { albumsOutline, handLeftOutline, gridOutline, mapOutline, shareSocialOutline, timeOutline, addCircleOutline, settingsOutline, homeOutline, expandOutline, contractOutline, trashOutline, personOutline, shieldHalfOutline, shieldOutline } from 'ionicons/icons'
import { useRoute, useRouter } from 'vue-router'
import engine from '../game/engineInstance'
import eventService from '../services/eventService'
import { useWebrtcQrService } from '../services/webrtcQrService'
// import GameContext from '../models/GameContext' if needed

export default {
  name: 'CurrentPlayerBoard',
  components: { IonButton, IonIcon, IonPopover, ShareModal },
  setup() {
    const webrtcQr = useWebrtcQrService()
    // Replace with GameContext instance usage
    const router = useRouter()
    const route = useRoute()
    const tick = ref(0)
    const settingsOpen = ref(false)
    const shareOpen = ref(false)
    const isFullscreen = ref(false)
    const settingsTriggerId = 'current-player-board-settings-trigger'
    let unsub: (() => void) | null = null

    function refreshFullscreenState() {
      isFullscreen.value = Boolean(document.fullscreenElement)
    }

    function refresh() {
      tick.value = (tick.value || 0) + 1
    }

    const activePlayerId = computed(() => engine.gameWorkflow.activePlayerId)
    const roundNumber = computed(() => engine.gameWorkflow.round)
    const multiplayerMode = computed(() => Boolean((webrtcQr as any).isRealtimeGameActive?.value))
    const role = computed(() => String((webrtcQr as any).activeRole?.value || ''))
    const connected = computed(() => Boolean((webrtcQr as any).connectedHost?.value || (webrtcQr as any).connectedClient?.value))
    // Determine the local player's id from role and multiplayer state.
    // Singleplayer/local: local player is always 0.
    // Multiplayer: server (host) is player 0, client is player 1.
    const playerId = computed(() => {
      if (multiplayerMode.value) {
        return role.value === 'client' ? 1 : 0
      }
      return 0
    })

    // Local player's turn when the engine's activePlayerId matches our local player id.
    const isLocalPlayersTurn = computed(() => Number(engine.gameWorkflow.activePlayerId) === Number(playerId.value))
    const playerCastleHp = computed(() => {
      const players = Array.isArray(engine.players) ? engine.players : []
      const p = players.find((entry: any) => Number(entry.id) === Number(playerId.value))
      return Number(p?.castleHp ?? 0)
    })
    const enemyCastleHp = computed(() => {
      const players = Array.isArray(engine.players) ? engine.players : []
      const enemy = players.find((entry: any) => Number(entry.id) !== Number(playerId.value))
      return Number(enemy?.castleHp ?? 0)
    })
    const currentPlayerLabel = computed(() => {
      const players = engine.players;
      const player = players.find((entry: any) => Number(entry.id) === playerId.value)
      return `${player.name}`
    })
    const turnIcon = computed(() => (isLocalPlayersTurn.value ? '▶️' : '⏳'))
    const turnLabel = computed(() => {
      if (isLocalPlayersTurn.value) return 'Your turn'
      return `Waiting for your turn (Player ${activePlayerId.value} is playing)`
    })

    function go(path: string) {
      if (route.path === path) return
      router.push(path)
    }

    function isActive(path: string) {
      return route.path === path
    }

    function createGameState() {
      if (!isLocalPlayersTurn.value) return
     
        engine.reset()
        webrtcQr.syncGameStateToClient?.('createGame')
     
        refresh()
     
      }

    function goFromSettings(path: string) {
      // if share requested, open modal; otherwise navigate
      if (path === '/share') {
        shareOpen.value = true
        return
      }
      go(path)
    }

    function toggleSettings() {
      settingsOpen.value = !settingsOpen.value
    }

    // Board is always visible; hide/show toggle removed.

    function clearLocalStorage() {
      try {
        engine.clearStoredState()
        window.location.reload() 
      } catch (e) {
        alert('Failed to clear local storage: ' + String(e))
      }
    }

    async function toggleFullscreen() {
      try {
        if (document.fullscreenElement) {
          await document.exitFullscreen()
        } else {
          await document.documentElement.requestFullscreen()
        }
      } catch (error) {
        console.error('Fullscreen toggle failed', error)
      } finally {
        refreshFullscreenState()
      }
    }

    const fullscreenLabel = computed(() => (isFullscreen.value ? 'Exit Fullscreen' : 'Fullscreen'))
    const fullscreenIcon = computed(() => (isFullscreen.value ? contractOutline : expandOutline))

    onMounted(() => {
      refresh()
      try { unsub = eventService.on('engine:stateChange', () => { refresh(); console.log('[CurrentPlayerBoard] engine emitted update') }) } catch (e) { unsub = null }
      refreshFullscreenState()
      document.addEventListener('fullscreenchange', refreshFullscreenState)
    })

    onUnmounted(() => {
      try { if (unsub) unsub() } catch (_) {}
      document.removeEventListener('fullscreenchange', refreshFullscreenState)
    })

    return {
      playerId,
      activePlayerId,
      currentPlayerLabel,
      roundNumber,
      playerCastleHp,
      enemyCastleHp,
      turnIcon,
      turnLabel,
      albumsOutline,
      handLeftOutline,
      gridOutline,
      mapOutline,
      settingsOutline,
      homeOutline,
      expandOutline,
      contractOutline,
      shareSocialOutline,
      timeOutline,
      personOutline,
      shieldHalfOutline,
      shieldOutline,
      addCircleOutline,
      trashOutline,
      settingsOpen,
      isFullscreen,
      fullscreenLabel,
      fullscreenIcon,
      settingsTriggerId,
      go,
      isActive,
      createGameState,
      goFromSettings,
      toggleFullscreen,
      toggleSettings,
      clearLocalStorage,
      isLocalPlayersTurn,
      shareOpen,
      ShareModal,
      
    }
  }
}
