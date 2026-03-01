import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import { IonicVue } from '@ionic/vue'
import App from './App.vue'
import Home from './views/Home.vue'
import HelloWorld from './views/HelloWorld.vue'
import Deck from './views/Deck.vue'
import Table from './views/Table.vue'
import Game from './views/Game.vue'
import Board from './views/Board.vue'
import WebrtcQR from './views/WebrtcQR.vue'

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
	,{ path: '/webrtc', component: WebrtcQR }
]

// Compute a robust base at runtime: prefer Vite's BASE_URL, otherwise infer
// the first path segment (useful when deployed under a repo name on GitHub Pages).
let runtimeBase = import.meta.env.BASE_URL
if (!runtimeBase || runtimeBase === '/') {
	try {
		const seg = window.location.pathname.split('/').filter(Boolean)[0]
		if (seg) runtimeBase = `/${seg}/`
	} catch (e) {
		runtimeBase = '/'
	}
}

const router = createRouter({
	history: createWebHashHistory(runtimeBase),
	routes
})

const app = createApp(App)
app.use(IonicVue)
app.use(router)

router.isReady().then(() => {
	app.mount('#app')
})
