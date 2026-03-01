import CardItem from '../components/CardItem.vue'
import { useDeckService } from '../services/deckService'
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton } from '@ionic/vue'

export default {
  name: 'Deck',
  components: { CardItem, IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton },
  data() {
    const deckService = useDeckService()
    return { deck: deckService.createDeck() }
  }
}
