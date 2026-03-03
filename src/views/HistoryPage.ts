import { computed } from 'vue'
import { IonPage, IonContent, IonButton } from '@ionic/vue'
// import GameContext from '../models/GameContext' if needed

export default {
  name: 'HistoryPage',
  components: { IonPage, IonContent, IonButton },
  setup() {
   
    function formatTime(value: number) {
      try {
        return new Date(value).toLocaleString()
      } catch (_e) {
        return String(value)
      }
    }

    return { formatTime }
  }
}
