<script setup>
// Page de création / édition d'un cours (remplace l'ancienne modale).
// Le contenu se rédige en Markdown via un éditeur à onglets Écrire / Aperçu.
// Création : /formateur/contenus/modules/:moduleId/cours/nouveau
// Édition : /formateur/contenus/cours/:id
import {ref, reactive, computed, onMounted} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {courseService} from '@/services/courseService'
import {moduleService} from '@/services/moduleService'
import {mediaService} from '@/services/mediaService'
import {validateVideoFile, ALLOWED_VIDEO_ACCEPT, resolveVideoSource} from '@/utils/media'
import Icon from '@/components/Icon.vue'
import Breadcrumb from '@/components/Breadcrumb.vue'
import MarkdownEditor from '@/components/MarkdownEditor.vue'

const route = useRoute()
const router = useRouter()

const isEdit = computed(() => route.name === 'content-course-edit')
const courseId = computed(() => (isEdit.value ? Number(route.params.id) : null))

const loading = ref(true)
const error = ref('')
const saving = ref(false)
const formError = ref('')
const moduleId = ref(null)
const moduleName = ref('')
const form = reactive({name: '', description: '', videoUrl: '', content: ''})

const title = computed(() => (isEdit.value ? 'Modifier le cours' : 'Nouveau cours'))
const backTo = computed(() => `/formateur/contenus/modules/${moduleId.value}`)

// Vidéo : upload de fichier ou URL externe, les deux écrivent dans form.videoUrl.
const videoInput = ref(null)
const uploadingVideo = ref(false)
const videoError = ref('')
const videoSource = computed(() => resolveVideoSource(form.videoUrl))

function openVideoPicker() {
  videoInput.value?.click()
}

async function onVideoSelected(event) {
  const file = (event.target.files || [])[0]
  event.target.value = ''
  if (!file) {
    return
  }
  const validationError = validateVideoFile(file)
  if (validationError) {
    videoError.value = validationError
    return
  }
  videoError.value = ''
  uploadingVideo.value = true
  try {
    const media = await mediaService.uploadVideo(file)
    form.videoUrl = media.url
  } catch (err) {
    videoError.value = err.message || "L'envoi de la vidéo a échoué."
  } finally {
    uploadingVideo.value = false
  }
}

function removeVideo() {
  form.videoUrl = ''
  videoError.value = ''
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    if (isEdit.value) {
      const course = await courseService.getCourse(courseId.value)
      form.name = course.name || ''
      form.description = course.description || ''
      form.videoUrl = course.videoUrl || ''
      form.content = course.content || ''
      moduleId.value = course.moduleId
      moduleName.value = course.moduleName || 'Module'
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
    formError.value = 'Le contenu est obligatoire.'
    return
  }
  if (content.length > 50000) {
    formError.value = 'Le contenu ne doit pas dépasser 50 000 caractères.'
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
      videoUrl: form.videoUrl.trim() || null,
      content,
      moduleId: moduleId.value
    }
    if (isEdit.value) {
      await courseService.updateCourse(courseId.value, payload)
    } else {
      await courseService.createCourse(payload)
    }
    router.push(backTo.value)
  } catch (err) {
    formError.value = err.message || "L'enregistrement a échoué."
    saving.value = false
  }
}

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
        <label class="block text-[13px] font-medium text-ink-soft mb-1.5">Nom du cours</label>
        <input
            v-model="form.name"
            type="text"
            maxlength="255"
            placeholder="Ex : Gérer les services avec systemd"
            class="w-full h-10 px-3 border border-input rounded-[10px] text-[14px] text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
        />
      </div>

      <div>
        <label class="block text-[13px] font-medium text-ink-soft mb-1.5">Description (facultative)</label>
        <textarea
            v-model="form.description"
            rows="2"
            maxlength="500"
            placeholder="Courte description affichée en en-tête du cours"
            class="w-full border border-input rounded-[10px] px-3 py-2 text-[14px] text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors resize-none"
        ></textarea>
      </div>

      <div>
        <label class="block text-[13px] font-medium text-ink-soft mb-1.5">Vidéo (facultative)</label>
        <input
            ref="videoInput"
            type="file"
            :accept="ALLOWED_VIDEO_ACCEPT"
            class="hidden"
            @change="onVideoSelected"
        />
        <div class="flex items-center gap-2">
          <input
              v-model="form.videoUrl"
              type="text"
              placeholder="Collez un lien YouTube, Vimeo ou une URL de vidéo"
              class="flex-1 h-10 px-3 border border-input rounded-[10px] text-[14px] text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
          />
          <button
              type="button"
              :disabled="uploadingVideo"
              class="h-10 px-4 rounded-[10px] border border-input text-primary text-sm font-semibold flex items-center gap-2 hover:bg-surface-tint transition-colors disabled:opacity-60 shrink-0"
              @click="openVideoPicker"
          >
            <Icon name="upload" :size="16"/>
            {{ uploadingVideo ? 'Envoi...' : 'Téléverser' }}
          </button>
          <button
              v-if="form.videoUrl"
              type="button"
              class="h-10 px-3 rounded-[10px] border border-danger text-danger text-sm font-semibold hover:bg-danger/8 transition-colors shrink-0"
              @click="removeVideo"
          >
            Retirer
          </button>
        </div>
        <p class="text-[12px] text-muted mt-1">Collez un lien (YouTube, Vimeo, URL directe) ou téléversez un fichier MP4
          ou WebM (200 Mo maximum).</p>
        <p v-if="videoError" class="text-[12px] text-danger mt-1">{{ videoError }}</p>

        <!-- Aperçu -->
        <div v-if="videoSource" class="mt-3 rounded-[12px] overflow-hidden border border-line bg-black">
          <iframe
              v-if="videoSource.type === 'iframe'"
              :src="videoSource.src"
              class="w-full aspect-video"
              frameborder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowfullscreen
          ></iframe>
          <video v-else :src="videoSource.src" controls class="w-full aspect-video"></video>
        </div>
      </div>

      <div>
        <label class="block text-[13px] font-medium text-ink-soft mb-1.5">Contenu du cours</label>
        <MarkdownEditor v-model="form.content" :rows="20"/>
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
