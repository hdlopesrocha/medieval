<template>
  <ion-app>
    <ActivePlayerBadge />
    <router-view />
  </ion-app>
</template>

<script>
import { IonApp } from '@ionic/vue'
import ActivePlayerBadge from './components/ActivePlayerBadge.vue'

export default {
  name: 'App',
  components: { IonApp, ActivePlayerBadge }
}
</script>
