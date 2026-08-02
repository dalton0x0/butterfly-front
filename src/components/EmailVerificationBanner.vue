<script setup>
/*
  Bandeau de rappel affiché tant que l'adresse e-mail n'est pas confirmée.

  Placé dans le layout plutôt que dans une vue précise : le rappel suit
  l'utilisateur où qu'il aille, la politique de vérification étant souple.

  Le bandeau peut être masqué pour la session en cours mais réapparaît au prochain
  chargement de l'application.
*/
import {computed, ref} from 'vue'
import {authService} from '@/services/authService'
import {useAuthStore} from '@/stores/auth'
import Icon from '@/components/Icon.vue'

const auth = useAuthStore()

const dismissed = ref(false)
const sending = ref(false)
const sent = ref(false)
const error = ref('')

const visible = computed(() =>
    auth.isAuthenticated && auth.user?.emailVerified === false && !dismissed.value
)

async function resend() {
  if (!auth.user?.email) {
    return
  }

  sending.value = true
  error.value = ''
  try {
    await authService.resendVerification(auth.user.email)
    sent.value = true
  } catch (err) {
    error.value = err?.message || "L'envoi a échoué. Veuillez réessayer."
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <div v-if="visible" class="bg-warning/10 border-b border-warning/25">
    <div class="max-w-[1200px] mx-auto w-full px-6 py-2 flex items-center gap-3 flex-wrap">
      <Icon name="mail" :size="18" class="text-warning shrink-0"/>

      <p v-if="sent" class="text-[13px] text-ink-soft flex-1 min-w-[200px]">
        Un nouveau lien de confirmation vient d'être envoyé à {{ auth.user.email }}.
      </p>
      <p v-else-if="error" class="text-[13px] text-danger flex-1 min-w-[200px]">{{ error }}</p>
      <p v-else class="text-[13px] text-ink-soft flex-1 min-w-[200px]">
        Confirmez votre adresse e-mail pour pouvoir récupérer votre compte en cas d'oubli de
        mot de passe.
      </p>

      <button v-if="!sent" type="button" :disabled="sending"
              class="text-[13px] text-primary font-semibold hover:underline disabled:opacity-60 disabled:cursor-not-allowed"
              @click="resend">
        {{ sending ? 'Envoi...' : 'Renvoyer le lien' }}
      </button>

      <button type="button" class="text-muted hover:text-ink shrink-0"
              aria-label="Masquer ce rappel" @click="dismissed = true">
        <Icon name="close" :size="18"/>
      </button>
    </div>
  </div>
</template>
