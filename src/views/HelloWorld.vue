<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Hello</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <h1>Hello World</h1>
      <ion-button @click="sayHello">Click me</ion-button>
    </ion-content>
  </ion-page>
</template>

<script>
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButton } from '@ionic/vue'

export default {
  name: 'HelloWorld',
  components: { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButton },
  setup() {
    const sayHello = () => alert('Hello World!')
    return { sayHello }
  }
}
</script>
