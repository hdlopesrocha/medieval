import { onMounted, onBeforeUnmount, watch } from 'vue'
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

    const goHandPage = () => {
      webrtcQr.setRole('local')
      router.push('/hand')
    }

    const goRealtimeGame = () => {
      router.push('/hand')
    }

    const goHistory = () => {
      router.push('/history')
    }

    const requestHistory = () => {
      webrtcQr.requestHistoryFromServer()
    }

    watch(
      () => {
        const connected = Boolean(webrtcQr.connectedHost?.value || webrtcQr.connectedClient?.value)
        const role = String(webrtcQr.activeRole?.value || '')
        return connected && (role === 'server' || role === 'client')
      },
      (isConnected) => {
        if (isConnected) router.push('/hand')
      }
    )

    onMounted(() => {
      webrtcQr.attach()
    })

    onBeforeUnmount(() => {
      webrtcQr.detach()
    })

    return { ...webrtcQr, goHandPage, goRealtimeGame, goHistory, requestHistory }
  }
}
