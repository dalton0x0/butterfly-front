import {createApp} from 'vue'
import {createPinia} from 'pinia'
import App from './App.vue'
import router from './router'
import './style.css'

// Création de l'application Vue avec Pinia (état) et Vue Router (navigation).
const app = createApp(App)
app.use(createPinia())
app.use(router)

/*
  Le montage passe par une chaîne de promesse et non par un await de premier niveau.

  Un await ici rendrait ce module asynchrone. Or les vues chargées à la demande
  importent ce même chunk qui contient tout le code partagé. Elles ne peuvent donc
  pas terminer leur évaluation tant que celle-ci est suspendue. Le routeur, lui,
  attend l'évaluation de la vue pour finaliser la navigation, donc pour résoudre
  isReady(). Les trois s'attendent mutuellement et l'application ne se monte jamais.

  Sonar signale ce motif au profit d'un await de premier niveau. La règle ne
  s'applique pas à un point d'entrée qui alimente des imports dynamiques.
*/
router.isReady().finally(() => { //NOSONAR
    app.mount('#app')
})
