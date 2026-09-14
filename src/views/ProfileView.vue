<script setup>
// Mon profil : assemble les quatre encarts et gère la reconnexion.
import {useRouter} from 'vue-router'
import {useAuthStore} from '@/stores/auth'
import Breadcrumb from '@/components/Breadcrumb.vue'
import ProfileSummaryCard from '@/components/ProfileSummaryCard.vue'
import ProfileInfoForm from '@/components/ProfileInfoForm.vue'
import ProfilePasswordForm from '@/components/ProfilePasswordForm.vue'
import ProfileSessions from '@/components/ProfileSessions.vue'

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

  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <ProfileSummaryCard/>

    <div class="lg:col-span-2 flex flex-col gap-6">
      <ProfileInfoForm @reconnect="reconnect"/>
      <ProfilePasswordForm @reconnect="reconnect"/>
      <ProfileSessions @reconnect="reconnect"/>
    </div>
  </div>
</template>
