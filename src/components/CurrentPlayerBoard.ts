import { ref, computed, onMounted, onUnmounted } from 'vue'
import { IonButton, IonIcon, IonPopover } from '@ionic/vue'
import { albumsOutline, handLeftOutline, gridOutline, mapOutline, shareSocialOutline, timeOutline, addCircleOutline, settingsOutline, homeOutline, expandOutline, contractOutline } from 'ionicons/icons'
import { useRoute, useRouter } from 'vue-router'
import engine from '../game/engineInstance'
import { useWebrtcQrService } from '../services/webrtcQrService'
// import GameContext from '../models/GameContext' if needed

export default {
  name: 'CurrentPlayerBoard',
  components: { IonButton, IonIcon, IonPopover },
  setup() {
    const webrtcQr = useWebrtcQrService()
    // Replace with GameContext instance usage
    const router = useRouter()
    const route = useRoute()
    const state = ref<any>({ playerId: 0, activePlayerId: 0, round: 0, players: [] })
    const settingsOpen = ref(false)
    const isFullscreen = ref(false)
    const settingsTriggerId = 'current-player-board-settings-trigger'
    const boardVisible = ref(true)
    let timer: ReturnType<typeof setInterval> | null = null

    function refreshFullscreenState() {
      isFullscreen.value = Boolean(document.fullscreenElement)
    }

    function refresh() {
      const nextState: any = engine.getState() || {}
      nextState.playerId = nextState.playerId
      nextState.activePlayerId = nextState.activePlayerId
      nextState.round = nextState.round
      nextState.players = nextState.players.map((player: any) => ({
        ...player,
        id: Number(player.id),
      }))
      state.value = nextState
    }

    const activePlayerId = computed(() => Number(state.value.activePlayerId))
    const roundNumber = computed(() => Number(state.value.round))
    const multiplayerMode = computed(() => Boolean((webrtcQr as any).isRealtimeGameActive?.value))
    const role = computed(() => String((webrtcQr as any).activeRole?.value || ''))
    const connected = computed(() => Boolean((webrtcQr as any).connectedHost?.value || (webrtcQr as any).connectedClient?.value))
    const playerId = computed(() => {
      if (!multiplayerMode.value) return activePlayerId.value
      return role.value === 'client' ? 1 : 0
    })
    const isLocalPlayersTurn = computed(() => playerId.value === activePlayerId.value)
    const isStateOwner = computed(() => {
      if (!connected.value) return true
      return role.value === 'server' || role.value === 'local'
    })
    const showCreateButton = computed(() => isStateOwner.value && Number(playerId.value) === Number(playerId.value))
    const playerCastleHp = computed(() => {
      const hpByPlayer = (state.value && state.value.castleHpByPlayer) || {}
      return hpByPlayer[hpByPlayer[String(playerId.value)]]
    })
    const enemyCastleHp = computed(() => {
      const enemyId = playerId.value
      const hpByPlayer = (state.value && state.value.castleHpByPlayer) || {}
      return hpByPlayer[enemyId]
    })
    const currentPlayerLabel = computed(() => {
      const player = (state.value.players || []).find((entry: any) => Number(entry.id) === playerId.value)
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
      if (!showCreateButton.value) return
      try {
        engine.startGame(['Server', 'Client'])
        const ownerRole = role.value === 'server' ? 'server' : (role.value === 'client' ? 'client' : 'local')
        const createPlayerId = ownerRole === 'client' ? 1 : 0
        // Persist create action into workflow/history
        try {
          engine.saveState('createGameState')
        } catch (e) {}
        ;(webrtcQr as any).syncGameStateToClient?.('createGame')
        refresh()
      } catch (e) {
        alert('Create failed: ' + e)
      }
    }

    function goFromSettings(path: string) {
      go(path)
    }

    function toggleSettings() {
      settingsOpen.value = !settingsOpen.value
    }

    function toggleBoardVisible() {
      boardVisible.value = !boardVisible.value
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
      addCircleOutline,
      showCreateButton,
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
      boardVisible,
      toggleBoardVisible
      
    }
  }
}
