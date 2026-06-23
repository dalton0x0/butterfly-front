<script setup>
// Espace formateur, gestion de contenu : les blocs.
// Un formateur ne voit et ne gère que ses blocs assignés (filtrage côté back).
// GET /api/blocks (liste), POST/PUT/DELETE /api/blocks (CRUD, ADMIN/TEACHER).
import {ref, reactive, computed, onMounted} from 'vue'
import {blockService} from '@/services/blockService'
import {mediaService} from '@/services/mediaService'
import {mediaUrl, validateImageFile, ALLOWED_IMAGE_ACCEPT} from '@/utils/media'
import Icon from '@/components/Icon.vue'
import BlockCover from '@/components/BlockCover.vue'
import Modal from '@/components/Modal.vue'

const loading = ref(true)
const error = ref('')
const blocks = ref([])
const success = ref('')

// Formulaire (création / modification)
const showForm = ref(false)
const editingId = ref(null) // null = création
const form = reactive({name: '', description: '', cover: ''})
const formError = ref('')
const saving = ref(false)

// Suppression
const showDelete = ref(false)
const deleting = ref(null)
const deleteError = ref('')
const removing = ref(false)

const COVER_THEMES = ['system', 'network', 'cloud']

function coverTheme(id) {
  return COVER_THEMES[((id || 1) - 1) % COVER_THEMES.length]
}

// Upload de la cover
const coverInput = ref(null)
const uploadingCover = ref(false)
const coverError = ref('')

function openCoverPicker() {
  coverInput.value?.click()
}

async function onCoverSelected(event) {
  const file = (event.target.files || [])[0]
  event.target.value = ''
  if (!file) {
    return
  }
  const validationError = validateImageFile(file)
  if (validationError) {
    coverError.value = validationError
    return
  }
  coverError.value = ''
  uploadingCover.value = true
  try {
    const media = await mediaService.uploadImage(file)
    form.cover = media.url
  } catch (err) {
    coverError.value = err.message || "L'envoi de l'image a échoué."
  } finally {
    uploadingCover.value = false
  }
}

function removeCover() {
  form.cover = ''
}

const formTitle = computed(() => (editingId.value ? 'Modifier le bloc' : 'Nouveau bloc'))

function openCreate() {
  editingId.value = null
  form.name = ''
  form.description = ''
  form.cover = ''
  formError.value = ''
  coverError.value = ''
  showForm.value = true
}

function openEdit(block) {
  editingId.value = block.id
  form.name = block.name || ''
  form.description = block.description || ''
  form.cover = block.cover || ''
  formError.value = ''
  coverError.value = ''
  showForm.value = true
}

async function save() {
  formError.value = ''
  const name = form.name.trim()
  if (name.length < 2 || name.length > 100) {
    formError.value = 'Le nom doit contenir entre 2 et 100 caractères.'
    return
  }
  if (form.description && form.description.length > 500) {
    formError.value = 'La description ne doit pas dépasser 500 caractères.'
    return
  }
  saving.value = true
  try {
    const payload = {
      name,
      description: form.description.trim() || null,
      cover: form.cover.trim() || null
    }
    if (editingId.value) {
      await blockService.updateBlock(editingId.value, payload)
      success.value = 'Bloc modifié avec succès.'
    } else {
      await blockService.createBlock(payload)
      success.value = 'Bloc créé avec succès.'
    }
    showForm.value = false
    await load()
  } catch (err) {
    formError.value = err.message || "L'enregistrement a échoué."
  } finally {
    saving.value = false
  }
}

function openDelete(block) {
  deleting.value = block
  deleteError.value = ''
  showDelete.value = true
}

async function confirmDelete() {
  deleteError.value = ''
  removing.value = true
  try {
    await blockService.deleteBlock(deleting.value.id)
    success.value = 'Bloc supprimé.'
    showDelete.value = false
    deleting.value = null
    await load()
  } catch (err) {
    deleteError.value = err.message || 'La suppression a échoué.'
  } finally {
    removing.value = false
  }
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const page = await blockService.getBlocks({size: 100})
    blocks.value = page.items
  } catch (err) {
    error.value = err.message || 'Impossible de charger les blocs.'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
    <h1 class="text-[30px] font-semibold text-navy">Contenus - Mes blocs</h1>
    <button
        class="h-10 px-5 rounded-[10px] bg-primary text-white text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity self-start"
        @click="openCreate"
    >
      <Icon name="add" :size="18"/>
      Nouveau bloc
    </button>
  </div>

  <p v-if="success" class="text-[14px] text-success bg-success/10 rounded-[10px] px-4 py-2.5 mb-5">{{ success }}</p>

  <div v-if="loading" class="text-[15px] text-muted py-10 text-center">Chargement des blocs...</div>
  <div v-else-if="error" class="text-[15px] text-danger bg-danger/8 rounded-[10px] px-4 py-3">{{ error }}</div>
  <div v-else-if="blocks.length === 0" class="text-[15px] text-muted py-10 text-center">
    Aucun bloc assigné. Créez un bloc ou demandez à un administrateur de vous en assigner un.
  </div>

  <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
    <div
        v-for="block in blocks"
        :key="block.id"
        class="bg-surface rounded-2xl shadow-[var(--shadow-card)] overflow-hidden flex flex-col"
    >
      <div class="h-[200px]">
        <img v-if="block.cover" :src="mediaUrl(block.cover)" :alt="block.name" class="w-full h-[200px] object-cover"/>
        <BlockCover v-else :theme="coverTheme(block.id)" :height="200"/>
      </div>
      <div class="p-5 flex flex-col gap-2 flex-1">
        <h3 class="text-[17px] font-semibold text-navy">{{ block.name }}</h3>
        <p class="text-[13px] text-ink-soft line-clamp-2 flex-1">{{ block.description || 'Aucune description.' }}</p>
        <div class="flex items-center gap-2 pt-2">
          <RouterLink
              :to="`/formateur/contenus/blocs/${block.id}`"
              class="h-9 px-3 rounded-[10px] bg-primary text-white text-sm font-semibold flex items-center gap-1.5 hover:opacity-90 transition-opacity"
          >
            <Icon name="folder_open" :size="16"/>
            Gérer le contenu
          </RouterLink>
          <button
              class="h-9 w-9 rounded-[10px] border border-input text-primary flex items-center justify-center hover:bg-surface-tint transition-colors"
              aria-label="Modifier"
              @click="openEdit(block)"
          >
            <Icon name="edit" :size="16"/>
          </button>
          <button
              class="h-9 w-9 rounded-[10px] border border-danger text-danger flex items-center justify-center hover:bg-danger/8 transition-colors"
              aria-label="Supprimer"
              @click="openDelete(block)"
          >
            <Icon name="delete" :size="16"/>
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Modale formulaire (création / modification) -->
  <Modal v-if="showForm" @close="showForm = false">
    <div class="px-6 pt-6 pb-6 w-full max-w-[480px]">
      <h3 class="text-[20px] font-semibold text-navy mb-5">{{ formTitle }}</h3>

      <div class="flex flex-col gap-4">
        <div>
          <label class="block text-[13px] font-medium text-ink-soft mb-1.5">Nom du bloc</label>
          <input
              v-model="form.name"
              type="text"
              maxlength="100"
              placeholder="Ex : Administration système"
              class="w-full h-10 px-3 border border-input rounded-[10px] text-[14px] text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
          />
        </div>

        <div>
          <label class="block text-[13px] font-medium text-ink-soft mb-1.5">Description (facultative)</label>
          <textarea
              v-model="form.description"
              rows="3"
              maxlength="500"
              placeholder="Décrivez le bloc de compétences..."
              class="w-full border border-input rounded-[10px] px-3 py-2 text-[14px] text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors resize-none"
          ></textarea>
        </div>

        <div>
          <label class="block text-[13px] font-medium text-ink-soft mb-1.5">Image de couverture (facultative)</label>
          <input
              ref="coverInput"
              type="file"
              :accept="ALLOWED_IMAGE_ACCEPT"
              class="hidden"
              @change="onCoverSelected"
          />
          <div v-if="form.cover" class="mb-2 rounded-[10px] overflow-hidden border border-line">
            <img :src="mediaUrl(form.cover)" alt="Aperçu de la couverture" class="w-full h-[200px] object-cover"/>
          </div>
          <div class="flex items-center gap-2">
            <button
                type="button"
                :disabled="uploadingCover"
                class="h-10 px-4 rounded-[10px] border border-input text-primary text-sm font-semibold flex items-center gap-2 hover:bg-surface-tint transition-colors disabled:opacity-60"
                @click="openCoverPicker"
            >
              <Icon name="upload" :size="16"/>
              {{ uploadingCover ? 'Envoi...' : (form.cover ? "Changer l'image" : 'Choisir une image') }}
            </button>
            <button
                v-if="form.cover"
                type="button"
                class="h-10 px-3 rounded-[10px] border border-danger text-danger text-sm font-semibold hover:bg-danger/8 transition-colors"
                @click="removeCover"
            >
              Retirer
            </button>
          </div>
          <p class="text-[12px] text-muted mt-1">PNG, JPEG, WebP ou GIF, 5 Mo maximum.</p>
          <p v-if="coverError" class="text-[12px] text-danger mt-1">{{ coverError }}</p>
        </div>

        <p v-if="formError" class="text-[13px] text-danger">{{ formError }}</p>

        <div class="flex justify-end gap-3 mt-1">
          <button
              type="button"
              class="h-10 px-4 rounded-[10px] border border-input text-ink text-sm font-semibold hover:bg-surface-tint transition-colors"
              @click="showForm = false"
          >
            Annuler
          </button>
          <button
              type="button"
              :disabled="saving"
              class="h-10 px-5 rounded-[10px] bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
              @click="save"
          >
            {{ saving ? 'Enregistrement...' : 'Enregistrer' }}
          </button>
        </div>
      </div>
    </div>
  </Modal>

  <!-- Modale de confirmation de suppression -->
  <Modal v-if="showDelete" @close="showDelete = false">
    <div class="px-6 pt-6 pb-6 w-full max-w-[420px] text-center">
      <div class="w-12 h-12 rounded-full bg-danger/10 text-danger flex items-center justify-center mx-auto mb-4">
        <Icon name="warning" :size="26"/>
      </div>
      <h3 class="text-[18px] font-semibold text-navy mb-2">Supprimer le bloc</h3>
      <p class="text-[14px] text-ink-soft mb-4">
        Confirmez-vous la suppression du bloc <strong>{{ deleting?.name }}</strong> ? Cette action est irréversible.
      </p>
      <p v-if="deleteError" class="text-[13px] text-danger mb-4">{{ deleteError }}</p>
      <div class="flex justify-center gap-3">
        <button
            type="button"
            class="h-10 px-4 rounded-[10px] border border-input text-ink text-sm font-semibold hover:bg-surface-tint transition-colors"
            @click="showDelete = false"
        >
          Annuler
        </button>
        <button
            type="button"
            :disabled="removing"
            class="h-10 px-5 rounded-[10px] bg-danger text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
            @click="confirmDelete"
        >
          {{ removing ? 'Suppression...' : 'Supprimer' }}
        </button>
      </div>
    </div>
  </Modal>
</template>
