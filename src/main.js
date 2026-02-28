import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { IonicVue } from '@ionic/vue'
import App from './App.vue'
import Home from './views/Home.vue'
import HelloWorld from './views/HelloWorld.vue'
import Deck from './views/Deck.vue'
import Table from './views/Table.vue'
import Game from './views/Game.vue'
import Board from './views/Board.vue'

/* Core CSS required for Ionic components to work properly */
import '@ionic/vue/css/core.css'
/* Basic CSS for apps built with Ionic */
import '@ionic/vue/css/normalize.css'
import '@ionic/vue/css/structure.css'
import '@ionic/vue/css/typography.css'
/* Optional CSS utils */
import '@ionic/vue/css/display.css'

/* App global styles */
import './styles.css'

const routes = [
	{ path: '/', component: Home },
	{ path: '/hello', component: HelloWorld },
	{ path: '/deck', component: Deck }
	,{ path: '/table', component: Table }
	,{ path: '/game', component: Game }
	,{ path: '/board', component: Board }
]

const router = createRouter({
	history: createWebHistory(import.meta.env.BASE_URL),
	routes
})

const app = createApp(App)
app.use(IonicVue)
app.use(router)

router.isReady().then(() => {
	app.mount('#app')
})
