<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/" />
        </ion-buttons>
        <ion-title>Deck</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding deck-bg">
      <div class="deck-grid">
        <CardItem v-for="(c, i) in deck" :key="i" :card="c" :show-export="true" />
      </div>
    </ion-content>
  </ion-page>
</template>

<script>
import CardItem from '../components/CardItem.vue'
import { createInitialDeck } from '../data/sampleDeck'
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton } from '@ionic/vue'

export default {
  name: 'Deck',
  components: { CardItem, IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton },
  data() {
    return { deck: createInitialDeck() }
  }
}
</script>
