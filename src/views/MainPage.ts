import { onMounted, onBeforeUnmount } from 'vue'
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon } from '@ionic/vue'
import { useRouter } from 'vue-router'
import { useWebrtcQrService } from '../services/webrtcQrService'
import CardItem from '../components/CardItem.vue'
import CurrentPlayerBoard from '../components/CurrentPlayerBoard.vue'

export default {
  name: 'MainPage',
  components: { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon, CardItem, CurrentPlayerBoard },
  setup() {
    const router = useRouter()
    const webrtcQr = useWebrtcQrService()

    const goLocalPlayer = () => {
      webrtcQr.setRole('local')
      router.push('/local')
    }

    const goRealtimeGame = () => {
      router.push('/local')
    }

    const goHistory = () => {
      router.push('/history')
    }

    const requestHistory = () => {
      webrtcQr.requestHistoryFromServer()
    }

    onMounted(() => {
      webrtcQr.attach()
    })

    onBeforeUnmount(() => {
      webrtcQr.detach()
    })

    return { ...webrtcQr, goLocalPlayer, goRealtimeGame, goHistory, requestHistory }
  }
}
