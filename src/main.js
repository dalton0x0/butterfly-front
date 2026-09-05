import {createApp} from 'vue'
import {createPinia} from 'pinia'
import App from './App.vue'
import router from './router'
import './style.css'

/*
  Délai maximal d'attente de la première navigation avant montage forcé.

  Attendre la route initiale évite un bref affichage de la mauvaise mise en page.
  Mais attendre sans limite est dangereux : une garde de navigation qui ne rend
  jamais la main laisse un écran blanc définitif, sans erreur ni message. Au delà
  de ce délai, l'application est montée quand même et le routeur termine sa
  navigation ensuite.
*/
const ROUTER_READY_TIMEOUT_MS = 5000

// Création de l'application Vue avec Pinia (état) et Vue Router (navigation).
const app = createApp(App)
app.use(createPinia())
app.use(router)

// Attente plafonnée de la route initiale.
try {
    await Promise.race([
        router.isReady(),
        new Promise((resolve) => {
            setTimeout(resolve, ROUTER_READY_TIMEOUT_MS)
        })
    ])
} finally {
    app.mount('#app')
}
