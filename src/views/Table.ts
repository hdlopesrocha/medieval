import CardItem from '../components/CardItem.vue'
import { ref, onMounted, onUnmounted } from 'vue'
import engine from '../game/engineInstance'
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButton } from '@ionic/vue'

export default {
  name: 'Table',
  components: { CardItem, IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButton },
  setup() {
    const state = ref(engine.getState())
    let timer = null
    function refresh() { state.value = engine.getState() }
    onMounted(() => { timer = setInterval(refresh, 700) })
    onUnmounted(() => { clearInterval(timer) })
    return { state, refresh }
  }
}
