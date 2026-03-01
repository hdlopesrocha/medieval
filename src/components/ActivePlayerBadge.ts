import { ref, onMounted, onUnmounted, computed } from 'vue'
import engine from '../game/engineInstance'

export default {
  name: 'ActivePlayerBadge',
  setup() {
    const state = ref(engine.getState())
    let timer = null
    onMounted(() => {
      timer = setInterval(() => { state.value = engine.getState() }, 500)
    })
    onUnmounted(() => { clearInterval(timer) })

    const activeId = computed(() => state.value.activePlayerId ?? 0)
    const activeName = computed(() => {
      const p = state.value.players && state.value.players[activeId.value]
      return p ? p.name : `Player ${activeId.value}`
    })
    const dotClass = computed(() => activeId.value === 0 ? 'green' : 'red')

    return { state, activeName, dotClass }
  }
}
