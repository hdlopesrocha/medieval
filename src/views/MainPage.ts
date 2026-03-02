import { onMounted, onBeforeUnmount } from 'vue'
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon } from '@ionic/vue'
import { useRouter } from 'vue-router'
import { useWebrtcQrService } from '../services/webrtcQrService'
import CardItem from '../components/CardItem.vue'

export default {
  name: 'MainPage',
  components: { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon, CardItem },
  setup() {
    const router = useRouter()
    const webrtcQr = useWebrtcQrService()

    const goViewDeck = () => {
      router.push('/deck')
    }

    const goLocalPlayer = () => {
      webrtcQr.setRole('local')
      router.push('/local')
    }

    onMounted(() => {
      webrtcQr.attach()
    })

    onBeforeUnmount(() => {
      webrtcQr.detach()
    })

    return { ...webrtcQr, goViewDeck, goLocalPlayer }
  }
}
