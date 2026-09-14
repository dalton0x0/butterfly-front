<script setup>
// Sessions actives et révocation des appareils.
import {computed, onMounted, ref} from 'vue'
import {profileService} from '@/services/profileService'
import {mapBackendError} from '@/utils/validators'
import {tokenStorage} from '@/services/tokenStorage'
import {formatDate} from '@/utils/date'
import Icon from '@/components/Icon.vue'
import StatusChip from '@/components/StatusChip.vue'
import Modal from '@/components/Modal.vue'

/*
  Une déconnexion suit ces opérations : le parent s'en charge, car c'est lui qui
  connaît la navigation. Ce composant se contente de signaler le moment.
*/
const emit = defineEmits(['reconnect'])

const sessions = ref([])
const sessionsLoading = ref(true)
const sessionsError = ref('')
const sessionActionId = ref(null)
const revokingOthers = ref(false)
const confirmRevokeOthers = ref(false)

// Identifiant de la session courante : sert à l'étiqueter dans la liste et à la
// protéger de la révocation groupée.
// Référence réactive et non simple constante : le rafraîchissement automatique des
// jetons remplace le refresh token courant par un nouveau, donc l'identifiant de
// session change pendant que la page reste ouverte. Une valeur figée au montage
// désignerait une session révoquée au bout de quelques minutes.
const currentSessionId = ref(tokenStorage.getSessionId())

const otherSessionsCount = computed(
  () => sessions.value.filter((session) => session.id !== currentSessionId.value).length
)

function formatSessionDate(value) {
  return formatDate(value, {
    fallback: 'Date inconnue',
    options: {day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'}
  })
}

async function loadSessions() {
  sessionsLoading.value = true
  sessionsError.value = ''
  try {
    sessions.value = await profileService.listSessions()
    // Cet appel a pu déclencher une rotation de jetons (401 puis refresh transparent),
    // qui attribue un nouvel identifiant à la session courante. On le relit après coup
    // pour que l'étiquette "Cet appareil" et la révocation groupée restent justes.
    currentSessionId.value = tokenStorage.getSessionId()
  } catch (err) {
    sessionsError.value = mapBackendError(err).globalError
  } finally {
    sessionsLoading.value = false
  }
}

async function revokeSession(sessionId) {
  sessionActionId.value = sessionId
  sessionsError.value = ''
  try {
    await profileService.revokeSession(sessionId)
    // Révoquer sa propre session revient à se déconnecter de cet appareil.
    if (sessionId === currentSessionId.value) {
      emit('reconnect')
      return
    }
    await loadSessions()
  } catch (err) {
    sessionsError.value = mapBackendError(err).globalError
  } finally {
    sessionActionId.value = null
  }
}

async function revokeOtherSessions() {
  confirmRevokeOthers.value = false
  revokingOthers.value = true
  sessionsError.value = ''
  try {
    // Aucun identifiant n'est transmis : le serveur détermine lui-même la session à
    // préserver à partir du jeton présenté. Un identifiant envoyé par le client serait
    // périmé dès la première rotation de jetons.
    await profileService.revokeOtherSessions()
    await loadSessions()
  } catch (err) {
    sessionsError.value = mapBackendError(err).globalError
  } finally {
    revokingOthers.value = false
  }
}

// Chargement au montage plutôt qu'à l'exécution du script de configuration. Un await de
// premier niveau dans un <script setup> transformerait le composant en composant
// asynchrone, qui exige alors un <Suspense> parent pour être monté : la page profil ne
// s'afficherait plus du tout.
onMounted(loadSessions)
</script>

<template>
  <div class="bg-surface rounded-2xl shadow-[var(--shadow-card)] p-6">
    <div class="flex items-center justify-between mb-4 gap-3 flex-wrap">
      <h3 class="text-[17px] font-semibold text-ink">Appareils connectés</h3>
      <button
        v-if="otherSessionsCount > 0"
        type="button"
        :disabled="revokingOthers"
        class="h-9 px-4 rounded-[10px] border border-danger text-danger text-[13px] font-semibold hover:bg-danger/8 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        @click="confirmRevokeOthers = true"
      >
        {{ revokingOthers ? 'Déconnexion...' : 'Déconnecter les autres appareils' }}
      </button>
    </div>

    <p class="text-[13px] text-muted mb-4">Chaque appareil ou navigateur connecté à votre compte
      apparaît ici. Révoquez une session pour en déconnecter l'appareil correspondant.</p>

    <p v-if="sessionsError" class="text-[13px] text-danger bg-danger/8 rounded-[10px] px-3 py-2 mb-4">
      {{ sessionsError }}</p>

    <p v-if="sessionsLoading" class="text-[13px] text-muted">Chargement des sessions...</p>

    <ul v-else class="flex flex-col gap-2">
      <li
        v-for="session in sessions"
        :key="session.id"
        class="flex items-center justify-between gap-3 border border-input rounded-[10px] px-4 py-3"
      >
        <div class="flex items-center gap-3 min-w-0">
          <Icon name="devices" :size="20" class="text-muted shrink-0"/>
          <div class="min-w-0">
            <p class="text-[14px] text-ink flex items-center gap-2 flex-wrap">
              Session ouverte le {{ formatSessionDate(session.createdAt) }}
              <StatusChip v-if="session.id === currentSessionId" label="Cet appareil" variant="success"/>
            </p>
            <p class="text-[12px] text-muted">Expire le {{ formatSessionDate(session.expiresAt) }}</p>
          </div>
        </div>
        <button
          type="button"
          :disabled="sessionActionId === session.id"
          class="h-9 px-4 rounded-[10px] text-[13px] font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
          :class="session.id === currentSessionId
            ? 'border border-input text-ink-soft hover:bg-surface-tint'
            : 'border border-danger text-danger hover:bg-danger/8'"
          @click="revokeSession(session.id)"
        >
          {{
            sessionActionId === session.id
              ? '...'
              : (session.id === currentSessionId ? 'Se déconnecter' : 'Révoquer')
          }}
        </button>
      </li>
    </ul>
  </div>

  <!-- Confirmation de la déconnexion des autres appareils -->
  <Modal v-if="confirmRevokeOthers" @close="confirmRevokeOthers = false">
    <div class="px-6 pt-6 pb-6">
      <h3 class="text-[20px] font-semibold text-navy mb-3">Déconnecter les autres appareils ?</h3>
      <p class="text-[14px] text-ink-soft mb-6">Toutes vos sessions seront révoquées sauf celle de cet
        appareil. Les autres appareils devront se reconnecter.</p>
      <div class="flex justify-end gap-3">
        <button
          type="button"
          class="h-10 px-5 rounded-[10px] border border-input text-ink-soft text-sm font-semibold hover:bg-surface-tint transition-colors"
          @click="confirmRevokeOthers = false"
        >
          Annuler
        </button>
        <button
          type="button"
          class="h-10 px-5 rounded-[10px] bg-danger text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          @click="revokeOtherSessions"
        >
          Déconnecter
        </button>
      </div>
    </div>
  </Modal>
</template>
