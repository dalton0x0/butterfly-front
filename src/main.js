import {createApp} from 'vue'
import {createPinia} from 'pinia'
import App from './App.vue'
import router from './router'
import './style.css'

// Création de l'application Vue avec Pinia (état) et Vue Router (navigation).
async function bootstrap() {
    const app = createApp(App)
    app.use(createPinia())
    app.use(router)
    try {
        await router.isReady()
    } finally {
        app.mount('#app')
    }
}

void bootstrap()
