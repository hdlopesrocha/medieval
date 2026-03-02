import { computed } from 'vue'
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButton } from '@ionic/vue'
import { useGameStateService } from '../services/gameStateService'
import CurrentPlayerBoard from '../components/CurrentPlayerBoard.vue'

export default {
  name: 'HistoryPage',
  components: { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, CurrentPlayerBoard },
  setup() {
    const gameState = useGameStateService()
    const entries = computed(() => gameState.getHistory('game'))

    function refresh() {
      void gameState.getHistory('game')
    }

    function clear() {
      gameState.clearHistory('game')
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
