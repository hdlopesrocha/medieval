import { computed } from 'vue'
import { IonPage, IonContent, IonButton } from '@ionic/vue'
import gameState from '../services/gameState'
// import GameContext from '../models/GameContext' if needed

export default {
  name: 'HistoryPage',
  components: { IonPage, IonContent, IonButton },
  setup() {
    // Replace with GameContext instance usage
    const entries = computed(() => gameState.getHistory())

    function refresh() {
      void gameState.getHistory()
    }

    function clear() {
      gameState.clearHistory()
    }

    function formatTime(value: number) {
      try {
        return new Date(value).toLocaleString()
      } catch (_e) {
        return String(value)
      }
    }

    return { entries, refresh, clear, formatTime }
  }
}
