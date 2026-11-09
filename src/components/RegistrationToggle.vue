<script setup>
// Ouverture de l'inscription publique, pour l'administrateur et le gestionnaire.
//
// Fermée (par défaut), seuls les comptes créés par l'administration existent : la page de
// connexion masque le lien « Créer un compte » et le serveur refuse toute inscription.
// Ouverte, chaque nouvel inscrit est rattaché à la promotion active et l'administration
// est prévenue par e-mail.
//
// L'interrupteur enregistre aussitôt, comme les préférences de notification, et revient
// en arrière si le serveur refuse.
import {onMounted, ref} from 'vue'
import {authService} from '@/services/authService'
import {settingsService} from '@/services/settingsService'
import {mapBackendError} from '@/utils/validators'

const open = ref(false)
const loading = ref(true)
const saving = ref(false)
const saved = ref(false)
const error = ref('')

onMounted(async () => {
  try {
    open.value = await authService.isRegistrationOpen()
  } catch (err) {
    error.value = mapBackendError(err).globalError
  } finally {
    loading.value = false
  }
})

async function toggle() {
  const previous = open.value
  open.value = !previous
  saving.value = true
  saved.value = false
  error.value = ''
  try {
    open.value = await settingsService.updateRegistrationOpen(open.value)
    saved.value = true
  } catch (err) {
    open.value = previous
    error.value = mapBackendError(err).globalError
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="bg-surface rounded-2xl shadow-[var(--shadow-card)] p-5">
    <div class="flex items-center justify-between gap-4">
      <div class="min-w-0">
        <h2 id="registration-toggle-label" class="text-[17px] font-semibold text-ink">Inscription publique</h2>
        <p class="text-[13px] text-muted">
          {{ open ? 'Ouverte : le lien « Créer un compte » est visible.' : "Fermée : seule l'administration crée les comptes." }}
        </p>
      </div>
      <!-- Interrupteur accessible, sur le modèle des préférences de notification. -->
      <button
        type="button"
        role="switch"
        :aria-checked="open"
        aria-labelledby="registration-toggle-label"
        :disabled="loading || saving"
        class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-60"
        :class="open ? 'bg-primary' : 'bg-input'"
        @click="toggle"
      >
        <span
          class="inline-block h-5 w-5 rounded-full bg-white shadow transition-transform"
          :class="open ? 'translate-x-[22px]' : 'translate-x-[2px]'"
        ></span>
      </button>
    </div>
    <p v-if="open" class="text-[12px] text-muted mt-3">
      Chaque inscrit rejoint la promotion en cours, s'il y en a une. Un e-mail vous prévient de chaque
      inscription : vous pouvez le couper dans votre profil.
    </p>
    <p v-if="saved" class="text-[12px] text-success mt-2">Enregistré</p>
    <p v-if="error" class="text-[13px] text-danger bg-danger/8 rounded-[10px] px-3 py-2 mt-3">{{ error }}</p>
  </div>
</template>
