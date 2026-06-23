import {createApp} from 'vue'
import {createPinia} from 'pinia'
import App from './App.vue'
import router from './router'
import './style.css'

// Création et montage de l'application Vue avec Pinia (état) et Vue Router (navigation)
const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
