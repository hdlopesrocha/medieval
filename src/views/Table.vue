<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/" />
        </ion-buttons>
        <ion-title>Table</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="reshuffle">Reshuffle</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding deck-bg">
      <div class="table-area">
        <div v-if="!state.cardsInPlay || state.cardsInPlay.length === 0">No cards in play</div>
        <div v-else style="display:flex;flex-wrap:wrap;gap:12px;justify-content:center">
          <div v-for="g in state.cardsInPlay" :key="g.id" style="min-width:160px">
            <CardItem :card="g.card" :hidden="g.hidden && g.ownerId !== state.activePlayerId" />
          </div>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script>
import CardItem from '../components/CardItem.vue'
import { ref, onMounted, onUnmounted } from 'vue'
import engine from '../game/engineInstance'
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton, IonButton } from '@ionic/vue'

export default {
  name: 'Table',
  components: { CardItem, IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton, IonButton },
  setup() {
    const state = ref(engine.getState())
    let timer = null
    function refresh() { state.value = engine.getState() }
    onMounted(() => { timer = setInterval(refresh, 700) })
    onUnmounted(() => { clearInterval(timer) })
    return { state, refresh }
  }
}
</script>

<style scoped>
.table-area {
  display:flex;
  flex-wrap:wrap;
  gap:12px;
  justify-content:center;
}
</style>
