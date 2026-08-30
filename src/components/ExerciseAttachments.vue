<script setup>
// Panneau des fichiers joints à l'énoncé d'un exercice.
// En mode lecture (apprenant), la liste sert uniquement au téléchargement.
// En mode gestion (formateur), l'ajout et la suppression sont proposés en plus.
//
// Sur un exercice qui n'existe pas encore, les fichiers choisis sont mis de côté
// en mémoire et affichés comme les autres. Le parent appelle uploadPending() une
// fois l'exercice créé pour les envoyer, l'API ayant besoin de son identifiant.
//
// Le téléchargement récupère un blob authentifié plutôt qu'un lien direct :
// l'URL du fichier n'est pas publique.
import {computed, onMounted, ref, watch} from 'vue'
import {exerciseService} from '@/services/exerciseService'
import {formatDate} from '@/utils/date'
import {formatFileSize} from '@/utils/upload'
import {ALLOWED_ATTACHMENT_ACCEPT, attachmentIcon, saveBlobAs, validateAttachmentFile} from '@/utils/attachment'
import Icon from './Icon.vue'
import Modal from './Modal.vue'

const props = defineProps({
  // null tant que l'exercice n'est pas enregistré : les fichiers sont alors mis en attente
  exerciseId: {type: Number, default: null},
  // true côté formateur : ajout et suppression proposés en plus du téléchargement
  manageable: {type: Boolean, default: false}
})

const loading = ref(false)
const error = ref('')
const busy = ref(false)
const attachments = ref([])
const pending = ref([])
const fileInput = ref(null)
const downloadingId = ref(null)
const toDelete = ref(null)

const hasFiles = computed(() => attachments.value.length > 0 || pending.value.length > 0)

// Compteur unique pour les fichiers en attente, qui n'ont pas encore d'identifiant serveur.
let pendingCounter = 0

defineExpose({
  /**
   * Envoie les fichiers mis en attente vers l'exercice fraîchement créé.
   *
   * @param {number} exerciseId l'identifiant renvoyé par la création
   * @returns {Promise<string>} un message d'erreur si un envoi a échoué, sinon une chaîne vide
   */
  async uploadPending(exerciseId) {
    if (pending.value.length === 0) {
      return ''
    }
    const failures = []
    for (const item of [...pending.value]) {
      try {
        await exerciseService.addAttachment(exerciseId, item.file)
        pending.value = pending.value.filter((entry) => entry.key !== item.key)
      } catch {
        failures.push(item.file.name)
      }
    }
    return failures.length > 0
        ? `Ces fichiers n'ont pas pu être joints : ${failures.join(', ')}.`
        : ''
  }
})

async function load() {
  if (!props.exerciseId) {
    return
  }
  loading.value = true
  error.value = ''
  try {
    attachments.value = await exerciseService.getAttachments(props.exerciseId)
  } catch (err) {
    error.value = err.message || 'Impossible de charger les pièces jointes.'
  } finally {
    loading.value = false
  }
}

function openFilePicker() {
  error.value = ''
  fileInput.value?.click()
}

// Les fichiers partent un par un : le back attend une pièce jointe par requête et
// applique sa limite de nombre à chaque ajout.
async function onFilesSelected(event) {
  const files = Array.from(event.target.files || [])
  event.target.value = ''
  if (files.length === 0) {
    return
  }

  busy.value = true
  try {
    for (const file of files) {
      const validationError = validateAttachmentFile(file)
      if (validationError) {
        error.value = `${file.name} : ${validationError}`
        continue
      }

      if (!props.exerciseId) {
        pendingCounter += 1
        pending.value.push({key: pendingCounter, file})
        continue
      }

      try {
        const created = await exerciseService.addAttachment(props.exerciseId, file)
        attachments.value.push(created)
      } catch (err) {
        error.value = err.message || `L'envoi de ${file.name} a échoué.`
      }
    }
  } finally {
    busy.value = false
  }
}

async function download(attachment) {
  error.value = ''
  downloadingId.value = attachment.id
  try {
    const blob = await exerciseService.downloadAttachment(props.exerciseId, attachment.id)
    saveBlobAs(blob, attachment.filename)
  } catch (err) {
    error.value = err.message || 'Le téléchargement a échoué.'
  } finally {
    downloadingId.value = null
  }
}

function removePending(key) {
  pending.value = pending.value.filter((entry) => entry.key !== key)
}

function askDelete(attachment) {
  error.value = ''
  toDelete.value = attachment
}

async function confirmDelete() {
  const attachment = toDelete.value
  if (!attachment) {
    return
  }
  busy.value = true
  try {
    await exerciseService.deleteAttachment(props.exerciseId, attachment.id)
    attachments.value = attachments.value.filter((item) => item.id !== attachment.id)
    toDelete.value = null
  } catch (err) {
    error.value = err.message || 'La suppression a échoué.'
    toDelete.value = null
  } finally {
    busy.value = false
  }
}

// L'identifiant arrive après coup si le parent enregistre puis reste sur la page.
watch(() => props.exerciseId, (id) => {
  if (id) {
    load()
  }
})

onMounted(load)
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex items-center justify-between gap-3">
      <p class="text-[13px] font-medium text-ink-soft">
        Fichiers joints
        <span v-if="hasFiles" class="text-muted font-normal">
          ({{ attachments.length + pending.length }})
        </span>
      </p>

      <template v-if="manageable">
        <label :for="`exercise-attachment-${exerciseId || 'new'}`" class="sr-only">
          Fichiers à joindre à l'énoncé
        </label>
        <input
          :id="`exercise-attachment-${exerciseId || 'new'}`"
          ref="fileInput"
          type="file"
          multiple
          :accept="ALLOWED_ATTACHMENT_ACCEPT"
          class="hidden"
          @change="onFilesSelected"
        />
        <button
          type="button"
          :disabled="busy"
          class="text-primary text-[13px] font-semibold hover:underline flex items-center gap-1 disabled:opacity-60"
          @click="openFilePicker"
        >
          <Icon name="attach_file" :size="16"/>
          {{ busy ? 'Envoi...' : 'Ajouter un fichier' }}
        </button>
      </template>
    </div>

    <p v-if="loading" class="text-[13px] text-muted">Chargement des fichiers...</p>
    <p v-if="error" class="text-[13px] text-danger">{{ error }}</p>

    <p v-if="!loading && !hasFiles" class="text-[13px] text-muted">
      {{ manageable ? 'Aucun fichier joint. Ajoutez une consigne, un support ou un jeu de données.' : 'Aucun fichier joint.' }}
    </p>

    <ul v-if="hasFiles" class="flex flex-col gap-2">
      <!-- Fichiers déjà sur le serveur -->
      <li
        v-for="attachment in attachments"
        :key="attachment.id"
        class="flex items-center gap-3 bg-background rounded-[10px] px-3 py-2.5"
      >
        <Icon :name="attachmentIcon(attachment.contentType)" :size="20" class="text-ink-soft shrink-0"/>

        <div class="flex-1 min-w-0">
          <p class="text-[14px] text-ink truncate">{{ attachment.filename }}</p>
          <p class="text-[12px] text-muted">
            {{ formatFileSize(attachment.sizeBytes) }}
            <span v-if="attachment.uploadedAt"> - ajouté le {{ formatDate(attachment.uploadedAt) }}</span>
          </p>
        </div>

        <button
          type="button"
          :disabled="downloadingId === attachment.id"
          class="text-muted hover:text-primary transition-colors disabled:opacity-40"
          :aria-label="`Télécharger ${attachment.filename}`"
          @click="download(attachment)"
        >
          <Icon name="download" :size="18"/>
        </button>

        <button
          v-if="manageable"
          type="button"
          :disabled="busy"
          class="text-muted hover:text-danger transition-colors disabled:opacity-40"
          :aria-label="`Supprimer ${attachment.filename}`"
          @click="askDelete(attachment)"
        >
          <Icon name="delete" :size="18"/>
        </button>
      </li>

      <!-- Fichiers choisis mais pas encore envoyés -->
      <li
        v-for="item in pending"
        :key="`pending-${item.key}`"
        class="flex items-center gap-3 bg-background rounded-[10px] px-3 py-2.5 border border-dashed border-input"
      >
        <Icon :name="attachmentIcon(item.file.type)" :size="20" class="text-ink-soft shrink-0"/>

        <div class="flex-1 min-w-0">
          <p class="text-[14px] text-ink truncate">{{ item.file.name }}</p>
          <p class="text-[12px] text-muted">
            {{ formatFileSize(item.file.size) }} - joint à l'enregistrement
          </p>
        </div>

        <button
          type="button"
          class="text-muted hover:text-danger transition-colors"
          :aria-label="`Retirer ${item.file.name}`"
          @click="removePending(item.key)"
        >
          <Icon name="close" :size="18"/>
        </button>
      </li>
    </ul>
  </div>

  <Modal v-if="toDelete" @close="toDelete = null">
    <div class="px-6 pt-6 pb-6 w-full max-w-[420px] text-center">
      <div class="w-12 h-12 rounded-full bg-danger/10 text-danger flex items-center justify-center mx-auto mb-4">
        <Icon name="warning" :size="26"/>
      </div>
      <h3 class="text-[18px] font-semibold text-navy mb-2">Supprimer ce fichier ?</h3>
      <p class="text-[14px] text-ink-soft mb-1 break-words">{{ toDelete.filename }}</p>
      <p class="text-[13px] text-muted mb-5">
        Le fichier sera définitivement retiré de l'énoncé et du serveur.
      </p>
      <div class="flex justify-center gap-3">
        <button type="button" :disabled="busy"
                class="h-10 px-4 rounded-[10px] border border-input text-ink text-sm font-semibold hover:bg-surface-tint transition-colors disabled:opacity-60"
                @click="toDelete = null">
          Annuler
        </button>
        <button type="button" :disabled="busy"
                class="h-10 px-5 rounded-[10px] bg-danger text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
                @click="confirmDelete">
          {{ busy ? 'Suppression...' : 'Supprimer' }}
        </button>
      </div>
    </div>
  </Modal>
</template>
