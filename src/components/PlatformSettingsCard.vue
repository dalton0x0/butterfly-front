<script setup>
// Réglages de la plateforme, pour l'administrateur et le gestionnaire.
//
// - Inscription publique. Fermée (par défaut), seuls les comptes créés par l'administration
//   existent : la page de connexion masque le lien « Créer un compte » et le serveur refuse
//   toute inscription. Ouverte, chaque inscrit rejoint la promotion active et
//   l'administration est prévenue par e-mail.
// - Gestion des blocs réservée. Activée, les formateurs ne créent plus de blocs et ne
//   modifient plus leur fiche (nom, description, couverture, prérequis). Ils remplissent
//   toujours les blocs qui leur sont confiés.
//
// Chaque interrupteur enregistre aussitôt, comme les préférences de notification, et
// revient en arrière si le serveur refuse.
import {onMounted, reactive, ref} from 'vue'
import {authService} from '@/services/authService'
import {settingsService} from '@/services/settingsService'
import {mapBackendError} from '@/utils/validators'
import SettingSwitch from '@/components/SettingSwitch.vue'

/**
 * État d'un réglage enregistré dès qu'il change.
 *
 * @param {() => Promise<boolean>} read lit la valeur sur le serveur
 * @param {(on: boolean) => Promise<boolean>} write enregistre la valeur et renvoie celle retenue
 */
function useSetting(read, write) {
  const on = ref(false)
  const busy = ref(true)
  const saved = ref(false)
  const error = ref('')

  async function init() {
    try {
      on.value = await read()
    } catch (err) {
      error.value = mapBackendError(err).globalError
    } finally {
      busy.value = false
    }
  }

  async function toggle() {
    const previous = on.value
    on.value = !previous
    busy.value = true
    saved.value = false
    error.value = ''
    try {
      on.value = await write(on.value)
      saved.value = true
    } catch (err) {
      on.value = previous
      error.value = mapBackendError(err).globalError
    } finally {
      busy.value = false
    }
  }

  // reactive : le gabarit lit registration.on et non registration.on.value.
  return reactive({on, busy, saved, error, init, toggle})
}

const registration = useSetting(
  () => authService.isRegistrationOpen(),
  (open) => settingsService.updateRegistrationOpen(open)
)

const blockManagement = useSetting(
  async () => (await settingsService.getSettings()).blockCreationRestricted,
  (restricted) => settingsService.updateBlockCreationRestricted(restricted)
)

onMounted(() => {
  registration.init()
  blockManagement.init()
})
</script>

<template>
  <div class="bg-surface rounded-2xl shadow-[var(--shadow-card)] p-5">
    <h2 class="text-[17px] font-semibold text-ink mb-4">Réglages</h2>

    <SettingSwitch
      id="setting-registration"
      label="Inscription publique"
      :description="registration.on
        ? 'Ouverte : le lien « Créer un compte » est visible.'
        : 'Fermée : seule l\'administration crée les comptes.'"
      :checked="registration.on"
      :disabled="registration.busy"
      @toggle="registration.toggle"
    />
    <p v-if="registration.on" class="text-[12px] text-muted mt-2">
      Chaque inscrit rejoint la promotion en cours, s'il y en a une. Un e-mail vous prévient de chaque
      inscription : vous pouvez le couper dans votre profil.
    </p>
    <p v-if="registration.saved" class="text-[12px] text-success mt-2">Enregistré</p>
    <p v-if="registration.error" class="text-[13px] text-danger bg-danger/8 rounded-[10px] px-3 py-2 mt-2">
      {{ registration.error }}
    </p>

    <div class="border-t border-line-soft mt-4 pt-4">
      <SettingSwitch
        id="setting-block-management"
        label="Blocs gérés par l'administration"
        :description="blockManagement.on
          ? 'Activé : seuls l\'administrateur et le gestionnaire créent et modifient les blocs.'
          : 'Désactivé : un formateur peut créer ses blocs et modifier ceux qui lui sont confiés.'"
        :checked="blockManagement.on"
        :disabled="blockManagement.busy"
        @toggle="blockManagement.toggle"
      />
      <p v-if="blockManagement.on" class="text-[12px] text-muted mt-2">
        Les formateurs continuent d'ajouter modules, cours, exercices et quiz dans leurs blocs.
      </p>
      <p v-if="blockManagement.saved" class="text-[12px] text-success mt-2">Enregistré</p>
      <p v-if="blockManagement.error" class="text-[13px] text-danger bg-danger/8 rounded-[10px] px-3 py-2 mt-2">
        {{ blockManagement.error }}
      </p>
    </div>
  </div>
</template>
