<script setup>
// Page de création / édition d'un exercice (remplace l'ancienne modale).
// L'énoncé se rédige en Markdown (peut contenir du code, des images...).
// Création : /formateur/contenus/modules/:moduleId/exercices/nouveau
// Édition : /formateur/contenus/exercices/:id
import {computed, onBeforeUnmount, onMounted, reactive, ref} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {exerciseService} from '@/services/exerciseService'
import {moduleService} from '@/services/moduleService'
import {mediaService, extractMediaImageUrls} from '@/services/mediaService'
import Icon from '@/components/Icon.vue'
import Breadcrumb from '@/components/Breadcrumb.vue'
import MarkdownEditor from '@/components/MarkdownEditor.vue'

const route = useRoute()
const router = useRouter()

const isEdit = computed(() => route.name === 'content-exercise-edit')
const exerciseId = computed(() => (isEdit.value ? Number(route.params.id) : null))

const loading = ref(true)
const error = ref('')
const saving = ref(false)
const formError = ref('')
const moduleId = ref(null)
const moduleName = ref('')
const form = reactive({name: '', content: ''})

// Référence à l'éditeur Markdown, pour récupérer ses images uploadées en session.
const editorRef = ref(null)

const title = computed(() => (isEdit.value ? "Modifier l'exercice" : 'Nouvel exercice'))
const backTo = computed(() => `/formateur/contenus/modules/${moduleId.value}`)

async function load() {
  loading.value = true
  error.value = ''
  try {
    if (isEdit.value) {
      const exercise = await exerciseService.getExercise(exerciseId.value)
      form.name = exercise.name || ''
      form.content = exercise.content || ''
      moduleId.value = exercise.moduleId
      moduleName.value = exercise.moduleName || 'Module'
    } else {
      moduleId.value = Number(route.params.moduleId)
      const module = await moduleService.getModule(moduleId.value)
      moduleName.value = module.name || 'Module'
    }
  } catch (err) {
    error.value = err.message || 'Chargement impossible.'
  } finally {
    loading.value = false
  }
}

async function save() {
  formError.value = ''
  const name = form.name.trim()
  if (name.length < 2 || name.length > 255) {
    formError.value = 'Le nom doit contenir entre 2 et 255 caractères.'
    return
  }
  const content = form.content.trim()
  if (!content) {
    formError.value = "L'énoncé est obligatoire."
    return
  }
  if (content.length > 50000) {
    formError.value = "L'énoncé ne doit pas dépasser 50 000 caractères."
    return
  }
  saving.value = true
  try {
    const payload = {name, content, moduleId: moduleId.value}
    if (isEdit.value) {
      await exerciseService.updateExercise(exerciseId.value, payload)
    } else {
      await exerciseService.createExercise(payload)
    }
    // Nettoyage des images de contenu uploadées cette session mais absentes du contenu final.
    await cleanupUnusedSessionMedia(content)
    router.push(backTo.value)
  } catch (err) {
    formError.value = err.message || "L'enregistrement a échoué."
    saving.value = false
  }
}

/**
 * Supprime les images de contenu uploadées pendant la session mais absentes de
 * l'énoncé final enregistré (cas "ajoutée puis retirée avant sauvegarde").
 */
async function cleanupUnusedSessionMedia(finalContent) {
  const uploaded = editorRef.value?.getSessionUploads?.() || []
  const keptImages = extractMediaImageUrls(finalContent)
  for (const url of uploaded) {
    if (!keptImages.includes(url)) {
      await mediaService.deleteMedia(url)
    }
  }
  editorRef.value?.clearSessionUploads?.()
}

// Si on quitte la page sans enregistrer, on nettoie les images uploadées cette session.
onBeforeUnmount(() => {
  const uploaded = editorRef.value?.getSessionUploads?.() || []
  uploaded.forEach((url) => mediaService.deleteMedia(url))
})

onMounted(load)
</script>

<template>
  <div v-if="loading" class="text-[15px] text-muted py-10 text-center">Chargement...</div>
  <div v-else-if="error" class="text-[15px] text-danger bg-danger/8 rounded-[10px] px-4 py-3">{{ error }}</div>

  <div v-else class="max-w-[900px] mx-auto">
    <Breadcrumb
      :items="[
        { label: 'Contenus', to: '/formateur/contenus' },
        { label: moduleName, to: backTo },
        { label: title }
      ]"
    />
    <h1 class="text-[30px] font-semibold text-navy mb-6">{{ title }}</h1>

    <div class="bg-surface rounded-2xl shadow-[var(--shadow-card)] p-6 flex flex-col gap-5">
      <div>
        <label class="block text-[13px] font-medium text-ink-soft mb-1.5">Nom de l'exercice</label>
        <input
          v-model="form.name"
          type="text"
          maxlength="255"
          placeholder="Ex : Créer un service systemd personnalisé"
          class="w-full h-10 px-3 border border-input rounded-[10px] text-[14px] text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
        />
      </div>

      <div>
        <label class="block text-[13px] font-medium text-ink-soft mb-1.5">Énoncé de l'exercice</label>
        <MarkdownEditor ref="editorRef" v-model="form.content" :rows="20"/>
      </div>

      <p v-if="formError" class="text-[13px] text-danger">{{ formError }}</p>

      <div class="flex justify-end gap-3">
        <RouterLink :to="backTo"
                    class="h-10 px-4 rounded-[10px] border border-input text-ink text-sm font-semibold flex items-center hover:bg-surface-tint transition-colors">
          Annuler
        </RouterLink>
        <button
          type="button"
          :disabled="saving"
          class="h-10 px-6 rounded-[10px] bg-primary text-white text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60"
          @click="save"
        >
          <Icon name="save" :size="18"/>
          {{ saving ? 'Enregistrement...' : 'Enregistrer' }}
        </button>
      </div>
    </div>
  </div>
</template>
