<script setup>
// Mon profil : assemble les encarts et gère la reconnexion.
import {useRouter} from 'vue-router'
import {useAuthStore} from '@/stores/auth'
import Breadcrumb from '@/components/Breadcrumb.vue'
import ProfileSummaryCard from '@/components/ProfileSummaryCard.vue'
import ProfileInfoForm from '@/components/ProfileInfoForm.vue'
import ProfilePasswordForm from '@/components/ProfilePasswordForm.vue'
import ProfileSessions from '@/components/ProfileSessions.vue'
import ProfileNotifications from '@/components/ProfileNotifications.vue'

const auth = useAuthStore()
const router = useRouter()

/*
  Trois des quatre encarts peuvent provoquer une déconnexion : changer d'adresse
  e-mail, changer de mot de passe ou révoquer la session de cet appareil. Le
  serveur révoque alors les jetons et il faut repasser par l'écran de connexion.

  La navigation reste ici plutôt que dans chaque encart. Un composant d'encart n'a
  pas à connaître le routeur pour faire son travail : il signale l'évènement, la
  vue décide de la suite.
*/
async function reconnect() {
  await auth.logout()
  router.push({name: 'login'})
}
</script>

<template>
  <Breadcrumb :items="[{ label: 'Accueil', to: '/' }, { label: 'Mon profil' }]"/>

  <ProfileSummaryCard class="mb-6"/>

  <!-- Informations et Sécurité côte à côte : de hauteurs proches, elles forment une ligne
       régulière. Notifications et sessions, de hauteur variable, prennent toute la largeur
       pour ne pas étirer une voisine. Sur mobile, les encarts s'empilent dans cet ordre. -->
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <ProfileInfoForm @reconnect="reconnect"/>
    <ProfilePasswordForm @reconnect="reconnect"/>
    <ProfileNotifications class="lg:col-span-2"/>
    <!-- Enveloppe nécessaire : ProfileSessions a deux racines (carte et fenêtre de
         confirmation), Vue ne saurait pas à laquelle appliquer la classe. -->
    <div class="lg:col-span-2">
      <ProfileSessions @reconnect="reconnect"/>
    </div>
  </div>
</template>
