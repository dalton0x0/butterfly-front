<script setup>
// Lecture d'un cours : en-tête, vidéo optionnelle, contenu, puis barre d'actions.
// GET /api/courses/{id} renvoie name, description, videoUrl, content, completed.
// POST /api/progress/courses/{courseId}/complete marque le cours terminé (USER).
import {computed, onMounted, ref} from 'vue'
import {ROLES} from '@/utils/roles'
import {useRoute} from 'vue-router'
import {useAuthStore} from '@/stores/auth'
import {courseService} from '@/services/courseService'
import Breadcrumb from '@/components/Breadcrumb.vue'
import Icon from '@/components/Icon.vue'
import MarkdownContent from '@/components/MarkdownContent.vue'
import {resolveVideoSource} from '@/utils/media'

const route = useRoute()
const auth = useAuthStore()

const loading = ref(true)
const error = ref('')
const course = ref(null)
const completed = ref(false)
const completing = ref(false)
const completeError = ref('')

// Seul un USER possède une progression de cours.
const canComplete = computed(() => auth.role === ROLES.USER)

// Source de la vidéo : lecteur embarqué (YouTube/Vimeo) ou balise video (fichier/URL directe).
const videoSource = computed(() => resolveVideoSource(course.value?.videoUrl))

const breadcrumb = computed(() => {
  const items = [{label: 'Mes blocs', to: '/blocs'}]
  if (course.value?.moduleId) {
    items.push({label: course.value.moduleName || 'Module', to: `/modules/${course.value.moduleId}`})
  }
  items.push({label: course.value?.name || 'Cours'})
  return items
})

async function markCompleted() {
  completeError.value = ''
  completing.value = true
  try {
    await courseService.markCompleted(course.value.id)
    completed.value = true
  } catch (err) {
    completeError.value = err.message || 'Impossible de marquer le cours comme terminé.'
  } finally {
    completing.value = false
  }
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    course.value = await courseService.getCourse(Number(route.params.id))
    completed.value = Boolean(course.value.completed)
  } catch (err) {
    error.value = err.message || 'Impossible de charger le cours.'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div v-if="loading" class="text-[15px] text-muted py-10 text-center">Chargement du cours...</div>
  <div v-else-if="error" class="text-[15px] text-danger bg-danger/8 rounded-[10px] px-4 py-3">{{ error }}</div>

  <div v-else-if="course" class="max-w-[1000px] mx-auto">
    <Breadcrumb :items="breadcrumb"/>

    <article class="bg-surface rounded-2xl shadow-[var(--shadow-card)] overflow-hidden">
      <!-- En-tête -->
      <header class="px-8 pt-10 pb-6 border-b border-line">
        <h1 class="text-[30px] font-semibold text-navy mb-3">{{ course.name }}</h1>
        <p v-if="course.description" class="text-ink-soft">{{ course.description }}</p>
      </header>

      <!-- Corps -->
      <div class="px-8 py-8 text-ink-soft leading-relaxed">
        <!-- Vidéo en tête du cours (lien embarqué ou fichier téléversé) -->
        <div v-if="videoSource" class="aspect-video w-full rounded-xl overflow-hidden mb-8 bg-black">
          <iframe
            v-if="videoSource.type === 'iframe'"
            :src="videoSource.src"
            class="w-full h-full"
            title="Vidéo du cours"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
          ></iframe>
          <video v-else :src="videoSource.src" controls class="w-full h-full"></video>
        </div>

        <!-- Contenu rédigé en Markdown, rendu formaté pour l'apprenant -->
        <MarkdownContent :source="course.content"/>
      </div>

      <!-- Barre d'actions -->
      <div class="bg-surface-tint px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
        <RouterLink
          v-if="course.moduleId"
          :to="`/modules/${course.moduleId}`"
          class="h-10 px-4 rounded-[10px] bg-white border border-input text-primary text-sm font-semibold flex items-center gap-2 hover:bg-background transition-colors"
        >
          <Icon name="arrow_back" :size="18"/>
          Retour au module
        </RouterLink>
        <span v-else></span>

        <div class="flex items-center gap-3">
          <span v-if="completeError" class="text-[13px] text-danger">{{ completeError }}</span>
          <span
            v-if="completed"
            class="h-10 px-4 rounded-[10px] bg-success/10 text-success text-sm font-semibold flex items-center gap-2"
          >
            <Icon name="check_circle" :size="18"/> Terminé
          </span>
          <button
            v-else-if="canComplete"
            :disabled="completing"
            class="h-10 px-5 rounded-[10px] bg-primary text-white text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
            @click="markCompleted"
          >
            <Icon name="check" :size="18"/>
            {{ completing ? 'Validation...' : 'Marquer comme terminé' }}
          </button>
        </div>
      </div>
    </article>
  </div>
</template>
