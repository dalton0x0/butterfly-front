<script setup>
// Éditeur Markdown réutilisable à deux onglets :
// Écrire (zone de saisie) et Aperçu (rendu formaté).
// Un bouton permet de téléverser une image, elle est envoyée au back
// puis la syntaxe ![](url) est insérée à l'endroit du curseur.
import {nextTick, ref} from 'vue'
import Icon from './Icon.vue'
import MarkdownContent from './MarkdownContent.vue'
import {mediaService, MEDIA_USAGE} from '@/services/mediaService'
import {ALLOWED_IMAGE_ACCEPT, validateImageFile} from '@/utils/media'

const props = defineProps({
  modelValue: {type: String, default: ''},
  rows: {type: Number, default: 16}
})
const emit = defineEmits(['update:modelValue'])

const mode = ref('write')
const textarea = ref(null)
const imageInput = ref(null)
const uploadingImage = ref(false)
const imageError = ref('')

function onInput(event) {
  emit('update:modelValue', event.target.value)
}

function openImagePicker() {
  imageInput.value?.click()
}

// Insère un texte à la position du curseur, puis replace le curseur juste après.
function insertAtCursor(snippet, caretOffset) {
  const el = textarea.value
  const start = el ? el.selectionStart : props.modelValue.length
  const end = el ? el.selectionEnd : props.modelValue.length
  const next = props.modelValue.slice(0, start) + snippet + props.modelValue.slice(end)
  emit('update:modelValue', next)
  nextTick(() => {
    if (el) {
      const position = start + (caretOffset != null ? caretOffset : snippet.length)
      el.focus()
      el.setSelectionRange(position, position)
    }
  })
}

async function onImageSelected(event) {
  const file = (event.target.files || [])[0]
  event.target.value = ''
  if (!file) {
    return
  }
  const validationError = validateImageFile(file)
  if (validationError) {
    imageError.value = validationError
    return
  }
  imageError.value = ''
  uploadingImage.value = true
  try {
    const media = await mediaService.uploadImage(file, MEDIA_USAGE.CONTENT)
    // On insère ![](url) et on place le curseur entre les crochets pour saisir le texte alternatif.
    insertAtCursor(`![](${media.url})`, 2)
  } catch (err) {
    imageError.value = err.message || "L'envoi de l'image a échoué."
  } finally {
    uploadingImage.value = false
  }
}
</script>

<template>
  <div class="border border-input rounded-[10px] overflow-hidden">
    <!-- Barre d'outils -->
    <div class="flex items-center justify-between border-b border-line bg-surface-tint px-2 py-1.5">
      <div class="flex items-center gap-1">
        <button
          type="button"
          class="px-3 py-1 rounded-md text-[13px] font-semibold flex items-center gap-1.5 transition-colors"
          :class="mode === 'write' ? 'bg-white text-primary shadow-sm' : 'text-ink-soft hover:text-ink'"
          @click="mode = 'write'"
        >
          <Icon name="edit" :size="16"/>
          Écrire
        </button>
        <button
          type="button"
          class="px-3 py-1 rounded-md text-[13px] font-semibold flex items-center gap-1.5 transition-colors"
          :class="mode === 'preview' ? 'bg-white text-primary shadow-sm' : 'text-ink-soft hover:text-ink'"
          @click="mode = 'preview'"
        >
          <Icon name="visibility" :size="16"/>
          Aperçu
        </button>
      </div>

      <input
        ref="imageInput"
        type="file"
        :accept="ALLOWED_IMAGE_ACCEPT"
        class="hidden"
        @change="onImageSelected"
      />
      <button
        v-if="mode === 'write'"
        type="button"
        :disabled="uploadingImage"
        class="px-3 py-1 rounded-md text-[13px] font-semibold flex items-center gap-1.5 text-ink-soft hover:text-primary transition-colors disabled:opacity-60"
        @click="openImagePicker"
      >
        <Icon name="image" :size="16"/>
        {{ uploadingImage ? 'Envoi...' : 'Image' }}
      </button>
    </div>

    <!-- Saisie -->
    <textarea
      v-if="mode === 'write'"
      ref="textarea"
      :value="modelValue"
      :rows="rows"
      placeholder="Rédigez en Markdown..."
      class="w-full px-4 py-3 text-[14px] text-ink font-mono leading-relaxed focus:outline-none resize-y"
      @input="onInput"
    ></textarea>

    <!-- Aperçu -->
    <div v-else class="px-4 py-3 min-h-[200px]">
      <MarkdownContent v-if="modelValue.trim()" :source="modelValue"/>
      <p v-else class="text-[14px] text-muted">Rien à prévisualiser pour le moment.</p>
    </div>
  </div>

  <p v-if="imageError" class="text-[12px] text-danger mt-1.5">{{ imageError }}</p>
  <p class="text-[12px] text-muted mt-1.5">
    Markdown supporté : titres (#), listes (-), gras (**texte**), code en ligne et blocs, images, liens, tableaux.
  </p>
</template>
