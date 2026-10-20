<script setup>
// Choix des notifications reçues par e-mail.
//
// Chaque interrupteur enregistre aussitôt son état : pas de bouton « Enregistrer » pour
// un réglage qui ne porte qu'une valeur. L'affichage change tout de suite et revient en
// arrière si le serveur refuse.
//
// Le serveur ne renvoie que les catégories qui concernent le rôle de l'utilisateur.
// Un administrateur n'en a aucune : l'encart ne s'affiche pas.
import {computed, onMounted, ref} from 'vue'
import {profileService} from '@/services/profileService'
import {useAuthStore} from '@/stores/auth'
import {mapBackendError} from '@/utils/validators'

const auth = useAuthStore()

// Libellés affichés : ils appartiennent à l'interface, l'API ne transmet que la catégorie.
const LABELS = {
  CORRECTIONS: {
    title: 'Corrections de mes exercices',
    description: 'Un exercice est validé ou à retravailler, avec la note et le commentaire.'
  },
  SUBMISSIONS: {
    title: 'Travaux à corriger',
    description: 'Un apprenant de vos blocs soumet un exercice.'
  },
  ASSIGNMENTS: {
    title: 'Mes blocs',
    description: 'Un bloc est ajouté à votre compte ou retiré.'
  },
  NEW_CONTENT: {
    title: 'Nouveautés',
    description: 'Un récapitulatif quotidien des cours, exercices et quiz publiés dans vos blocs.'
  }
}

const preferences = ref([])
const loading = ref(true)
const error = ref('')
const savingCategory = ref(null)
const savedCategory = ref(null)

const items = computed(() => preferences.value
  .filter((preference) => LABELS[preference.category])
  .map((preference) => ({...preference, ...LABELS[preference.category]})))

async function load() {
  loading.value = true
  error.value = ''
  try {
    preferences.value = await profileService.getNotificationPreferences()
  } catch (err) {
    error.value = mapBackendError(err).globalError
  } finally {
    loading.value = false
  }
}

async function toggle(item) {
  const enabled = !item.enabled
  const previous = preferences.value
  error.value = ''
  savedCategory.value = null
  savingCategory.value = item.category
  // Mise à jour immédiate de l'affichage, annulée en cas d'échec.
  preferences.value = previous.map((p) => (p.category === item.category ? {...p, enabled} : p))
  try {
    preferences.value = await profileService.updateNotificationPreferences({[item.category]: enabled})
    savedCategory.value = item.category
  } catch (err) {
    preferences.value = previous
    error.value = mapBackendError(err).globalError
  } finally {
    savingCategory.value = null
  }
}

onMounted(load)
</script>

<template>
  <div v-if="loading || error || items.length > 0" id="notifications"
       class="bg-surface rounded-2xl shadow-[var(--shadow-card)] p-6">
    <h3 class="text-[17px] font-semibold text-ink mb-1">Notifications par e-mail</h3>
    <p class="text-[13px] text-muted mb-4">
      Choisissez les messages que vous recevez. Les e-mails de sécurité (confirmation d'adresse,
      mot de passe) sont toujours envoyés.
    </p>

    <p v-if="auth.user && auth.user.emailVerified === false"
       class="text-[13px] text-[#b45309] bg-[#f59e0b]/12 rounded-[10px] px-3 py-2 mb-4">
      Confirmez votre adresse e-mail pour recevoir ces notifications.
    </p>

    <p v-if="error" class="text-[13px] text-danger bg-danger/8 rounded-[10px] px-3 py-2 mb-4">{{ error }}</p>

    <p v-if="loading" class="text-[13px] text-muted">Chargement des préférences...</p>

    <ul v-else class="flex flex-col divide-y divide-line-soft">
      <li v-for="item in items" :key="item.category" class="flex items-center justify-between gap-4 py-3">
        <div class="min-w-0">
          <p :id="`notification-${item.category}`" class="text-[14px] font-medium text-ink">{{ item.title }}</p>
          <p class="text-[13px] text-muted">{{ item.description }}</p>
        </div>
        <div class="flex items-center gap-3 shrink-0">
          <span v-if="savedCategory === item.category" class="text-[12px] text-success">Enregistré</span>
          <!-- Interrupteur accessible : role="switch" et aria-checked annoncent l'état
               aux lecteurs d'écran, le libellé est relié par aria-labelledby. -->
          <button
            type="button"
            role="switch"
            :aria-checked="item.enabled"
            :aria-labelledby="`notification-${item.category}`"
            :disabled="savingCategory === item.category"
            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-60"
            :class="item.enabled ? 'bg-primary' : 'bg-input'"
            @click="toggle(item)"
          >
            <span
              class="inline-block h-5 w-5 rounded-full bg-white shadow transition-transform"
              :class="item.enabled ? 'translate-x-[22px]' : 'translate-x-[2px]'"
            ></span>
          </button>
        </div>
      </li>
    </ul>
  </div>
</template>
