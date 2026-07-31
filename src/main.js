import {createApp} from 'vue'
import {createPinia} from 'pinia'
import App from './App.vue'
import router from './router'
import './style.css'

// Création de l'application Vue avec Pinia (état) et Vue Router (navigation).
const app = createApp(App)
app.use(createPinia())
app.use(router)

// Attente de la résolution de la route initiale avant le montage.
try {
    await router.isReady()
} finally {
    app.mount('#app')
}
