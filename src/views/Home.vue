<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Home</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
        <h2>Welcome to Ionic + Vue</h2>
        <ion-button @click="showAlert">Show Alert</ion-button>
        <ion-button @click="goDeck" color="secondary">View Deck</ion-button>
        <ion-button @click="goTable" color="tertiary">Open Table</ion-button>
        <ion-button @click="goGame" color="success">Open Game</ion-button>
        <ion-button @click="goBoard" color="medium">Open Board</ion-button>
        <ion-button @click="goWebrtc" color="dark">WebRTC QR</ion-button>
      </ion-content>
  </ion-page>
</template>

<script>
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
</script>
