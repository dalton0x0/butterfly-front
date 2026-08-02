<script setup>
// Demande d'un lien de réinitialisation de mot de passe.
import {reactive, ref} from 'vue'
import {authService} from '@/services/authService'
import {validateEmail} from '@/utils/validators'
import Icon from '@/components/Icon.vue'
import LogoIcon from '@/components/LogoIcon.vue'

const loading = ref(false)
const submitted = ref(false)

const form = reactive({email: ''})
const errors = reactive({email: '', global: ''})

function clearError() {
  errors.email = ''
  errors.global = ''
}

async function handleSubmit() {
  errors.global = ''
  errors.email = validateEmail(form.email)
  if (errors.email) {
    return
  }

  loading.value = true
  try {
    await authService.forgotPassword(form.email)
    // Confirmation affichée quelle que soit la réponse du serveur, qui ne dit jamais
    // si un compte correspond.
    submitted.value = true
  } catch (err) {
    // Seules les erreurs techniques remontent ici : une adresse inconnue renvoie un
    // succès côté serveur.
    errors.global = err?.message || 'Une erreur est survenue. Veuillez réessayer.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="bg-surface w-full max-w-[440px] rounded-2xl p-10 shadow-[var(--shadow-card)] flex flex-col items-center">
    <div class="w-15 h-15 rounded-full bg-surface-tint flex items-center justify-center mb-4 text-primary">
      <LogoIcon/>
    </div>

    <!-- Écran de confirmation : le formulaire disparaît pour éviter les envois répétés -->
    <template v-if="submitted">
      <h2 class="text-[22px] font-semibold text-navy mb-1">Vérifiez votre messagerie</h2>
      <p class="text-[13px] text-ink-soft text-center mb-6 leading-relaxed">
        Si un compte est associé à cette adresse, un lien de réinitialisation vient d'être envoyé.
        Ce lien est valable trente minutes et ne peut servir qu'une fois.
      </p>
      <p class="text-[12px] text-muted text-center mb-6">
        Pensez à consulter vos courriers indésirables si vous ne voyez rien arriver.
      </p>
      <RouterLink to="/connexion"
                  class="w-full h-10 rounded-[10px] bg-primary text-white text-sm font-semibold flex items-center justify-center hover:opacity-90 transition-opacity">
        Retour à la connexion
      </RouterLink>
    </template>

    <template v-else>
      <h2 class="text-[22px] font-semibold text-navy mb-1">Mot de passe oublié</h2>
      <p class="text-[13px] text-muted mb-6 text-center">
        Indiquez votre adresse e-mail pour recevoir un lien de réinitialisation.
      </p>

      <form class="w-full flex flex-col gap-5" @submit.prevent="handleSubmit" novalidate>
        <p v-if="errors.global" class="text-[13px] text-danger bg-danger/8 rounded-[10px] px-3 py-2">
          {{ errors.global }}
        </p>

        <div class="flex flex-col gap-1.5">
          <label for="forgot-email" class="text-[13px] text-ink-soft font-medium">Adresse e-mail</label>
          <div class="relative">
            <input
              id="forgot-email"
              v-model="form.email"
              @input="clearError"
              type="email"
              autocomplete="email"
              placeholder="vous@exemple.fr"
              class="w-full h-10 pl-10 pr-3 border rounded-[10px] text-sm text-ink outline-none transition-colors focus:border-primary"
              :class="errors.email ? 'border-danger' : 'border-input'"
            />
            <Icon name="mail" :size="18" class="absolute left-3 top-1/2 -translate-y-1/2 text-muted"/>
          </div>
          <p v-if="errors.email" class="text-[12px] text-danger">{{ errors.email }}</p>
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="w-full h-10 rounded-[10px] bg-primary text-white text-sm font-semibold flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {{ loading ? 'Envoi en cours...' : 'Envoyer le lien' }}
        </button>

        <RouterLink to="/connexion" class="text-[13px] text-primary font-semibold hover:underline text-center">
          Retour à la connexion
        </RouterLink>
      </form>
    </template>
  </div>
</template>
