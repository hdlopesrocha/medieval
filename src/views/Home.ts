import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButton } from '@ionic/vue'

export default {
  name: 'Home',
  components: { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButton },
  setup() {
    const router = useRouter()
    const showAlert = () => {
      alert('Hello from Ionic + Vue')
    }
    const goDeck = () => {
      router.push('/deck')
    }
    const goTable = () => {
      router.push('/table')
    }
    const goGame = () => {
      router.push('/game')
    }
    const goBoard = () => {
      router.push('/board')
    }
    const goWebrtc = () => {
      router.push('/webrtc')
    }
    return { showAlert, goDeck, goTable, goGame, goBoard, goWebrtc }
  }
}
