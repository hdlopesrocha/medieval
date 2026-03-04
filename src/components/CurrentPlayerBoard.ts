import { ref, computed, onMounted, onUnmounted } from 'vue'
import { IonButton, IonIcon, IonPopover } from '@ionic/vue'
import ShareModal from './ShareModal.vue'
import { albumsOutline, handLeftOutline, gridOutline, mapOutline, shareSocialOutline, timeOutline, addCircleOutline, settingsOutline, homeOutline, expandOutline, contractOutline, trashOutline, personOutline, shieldHalfOutline, shieldOutline } from 'ionicons/icons'
import { useRoute, useRouter } from 'vue-router'
import engine from '../game/engineInstance'
import { useWebrtcQrService } from '../services/webrtcQrService'
import gameStateService from '../services/gameStateService'
// import GameContext from '../models/GameContext' if needed

export default {
  name: 'CurrentPlayerBoard',
  components: { IonButton, IonIcon, IonPopover },
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
    let timer: ReturnType<typeof setInterval> | null = null

    function refreshFullscreenState() {
      isFullscreen.value = Boolean(document.fullscreenElement)
    }

    function refresh() {
      tick.value = (tick.value || 0) + 1
    }

    const activePlayerId = computed(() => Number(engine.gameWorkflow?.activePlayerId ?? 0))
    const roundNumber = computed(() => Number(engine.gameWorkflow?.round ?? 0))
    const multiplayerMode = computed(() => Boolean((webrtcQr as any).isRealtimeGameActive?.value))
    const role = computed(() => String((webrtcQr as any).activeRole?.value || ''))
    const connected = computed(() => Boolean((webrtcQr as any).connectedHost?.value || (webrtcQr as any).connectedClient?.value))
    const playerId = computed(() => {
      if (!multiplayerMode.value) return activePlayerId.value
      return role.value === 'client' ? 1 : 0
    })
    const isLocalPlayersTurn = computed(() => engine.gameContext.playerId === engine.gameWorkflow.activePlayerId)
    const playerCastleHp = computed(() => {
      const ctx: any = engine.gameContext || {}
      const hpByPlayer = ctx.castleHpByPlayer || {}
      return hpByPlayer[String(playerId.value)]
    })
    const enemyCastleHp = computed(() => {
      const ctx: any = engine.gameContext || {}
      const hpByPlayer = ctx.castleHpByPlayer || {}
      const enemyId = playerId.value === 0 ? 1 : 0
      return hpByPlayer[String(enemyId)]
    })
    const currentPlayerLabel = computed(() => {
      const players = Array.isArray(engine.players) ? engine.players.map((p: any) => ({ ...p, id: Number(p.id) })) : []
      const player = (players || []).find((entry: any) => Number(entry.id) === playerId.value)
      if (player?.name) return `${player.name} (Player ${playerId.value})`
      return `Player ${playerId.value}`
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
      try {
        const wf = (engine as any).createGameState()
        ;(webrtcQr as any).syncGameStateToClient?.('createGame')
        refresh()
      } catch (e) {
        alert('Create failed: ' + e)
      }
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
        // clear persisted keys via service
        try { gameStateService.clearGameState() } catch (e) {}
        try { gameStateService.clearWorkflowState() } catch (e) {}
        // best-effort full localStorage clear
        try { if (typeof window !== 'undefined' && window.localStorage) window.localStorage.clear() } catch (e) {}
        // reload to reset in-memory engine state
        try { window.location.reload() } catch (e) {}
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
      timer = setInterval(refresh, 500)
      refreshFullscreenState()
      document.addEventListener('fullscreenchange', refreshFullscreenState)
    })

    onUnmounted(() => {
      if (timer) clearInterval(timer)
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
