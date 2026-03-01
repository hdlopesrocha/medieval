import { onMounted, onBeforeUnmount } from 'vue'
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon } from '@ionic/vue'
import { useWebrtcQrService } from '../services/webrtcQrService'

export default {
  name: 'WebrtcQR',
  components: { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon },
  setup() {
    const webrtcQr = useWebrtcQrService()

    onMounted(() => {
      webrtcQr.attach()
    })

    onBeforeUnmount(() => {
      webrtcQr.detach()
    })

    return { ...webrtcQr }
  }
}
