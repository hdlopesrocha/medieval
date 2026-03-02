import { ref, computed, onMounted, onUnmounted } from 'vue'
import engine from '../game/engineInstance'
import { useWebrtcQrService } from '../services/webrtcQrService'

export default {
  name: 'CurrentPlayerBoard',
  setup() {
    const webrtcQr = useWebrtcQrService()
    const state = ref<any>({ activePlayerId: 0, currentUser: 0, round: 1, players: [] })
    let timer: ReturnType<typeof setInterval> | null = null

    function refresh() {
      const nextState: any = engine.getState() || {}
      nextState.activePlayerId = Number(nextState.activePlayerId || 0)
      nextState.currentUser = Number(nextState.currentUser ?? nextState.activePlayerId ?? 0)
      nextState.round = Number(nextState.round || 1)
      nextState.players = (nextState.players || []).map((player: any) => ({
        ...player,
        id: Number(player.id)
      }))
      state.value = nextState
    }

    const currentUserId = computed(() => Number(state.value.currentUser ?? state.value.activePlayerId ?? 0))
    const activePlayerId = computed(() => Number(state.value.activePlayerId ?? 0))
    const roundNumber = computed(() => Number(state.value.round || 1))
    const multiplayerMode = computed(() => Boolean((webrtcQr as any).isRealtimeGameActive?.value))
    const role = computed(() => String((webrtcQr as any).activeRole?.value || ''))
    const localPlayerId = computed(() => {
      if (!multiplayerMode.value) return activePlayerId.value
      return role.value === 'client' ? 1 : 0
    })
    const isLocalPlayersTurn = computed(() => Number(localPlayerId.value) === Number(activePlayerId.value))
    const currentPlayerLabel = computed(() => {
      const player = (state.value.players || []).find((entry: any) => Number(entry.id) === currentUserId.value)
      if (player?.name) return `${player.name} (Player ${currentUserId.value})`
      return `Player ${currentUserId.value}`
    })
    const turnIcon = computed(() => (isLocalPlayersTurn.value ? '▶️' : '⏳'))
    const turnLabel = computed(() => {
      if (isLocalPlayersTurn.value) return 'Your turn'
      return `Waiting for your turn (Player ${activePlayerId.value} is playing)`
    })

    onMounted(() => {
      refresh()
      timer = setInterval(refresh, 500)
    })

    onUnmounted(() => {
      if (timer) clearInterval(timer)
    })

    return {
      currentPlayerLabel,
      roundNumber,
      turnIcon,
      turnLabel
    }
  }
}
