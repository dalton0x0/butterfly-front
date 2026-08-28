<script setup>
// Éditeur Markdown réutilisable.
// Trois modes : Écrire, Aperçu, et Côte à côte sur grand écran.
// Une barre d'outils applique la syntaxe sur la sélection courante, avec les
// raccourcis clavier usuels (gras, italique, lien).
// La touche Entrée poursuit une liste ou une citation commencée, et la termine
// si l'élément courant est laissé vide.
// Les images arrivent de trois façons : bouton de sélection, collage d'une
// capture d'écran, ou glisser-déposer. Dans les trois cas le fichier est envoyé
// au back puis la syntaxe ![](url) remplace le jeton posé à l'endroit du curseur.
import {computed, nextTick, ref, useId} from 'vue'
import Icon from './Icon.vue'
import MarkdownContent from './MarkdownContent.vue'
import {mediaService, MEDIA_USAGE} from '@/services/mediaService'
import {ALLOWED_IMAGE_ACCEPT, validateImageFile} from '@/utils/media'

const props = defineProps({
  modelValue: {type: String, default: ''},
  rows: {type: Number, default: 16},
  // Identifiant de la zone de saisie, pour qu'une étiquette placée par le parent
  // puisse s'y rattacher. Laissé libre, il est généré automatiquement.
  inputId: {type: String, default: null}
})

// useId fournit un identifiant unique par instance du composant, stable entre les rendus.
const generatedId = useId()
const textareaId = computed(() => props.inputId || `markdown-editor-${generatedId}`)
const imageInputId = computed(() => `${textareaId.value}-image`)
const emit = defineEmits(['update:modelValue'])

const mode = ref('write')
const textarea = ref(null)
const imageInput = ref(null)
const uploadingImage = ref(false)
const imageError = ref('')
const dragging = ref(false)

const showEditor = computed(() => mode.value !== 'preview')
const showPreview = computed(() => mode.value !== 'write')

// Motifs de reconnaissance des débuts de ligne Markdown.
// Les motifs « PREFIX » servent à détecter et à retirer, les autres à découper.
const HEADING_PREFIX_PATTERN = /^#{1,6}\s/
const ORDERED_PREFIX_PATTERN = /^(\s*)\d+\.\s/
const BULLET_PREFIX_PATTERN = /^(\s*)[-*]\s/
const QUOTE_PREFIX_PATTERN = /^(\s*)>\s?/
const ORDERED_ITEM_PATTERN = /^(\s*)(\d+)\.\s(.*)$/
const BULLET_ITEM_PATTERN = /^(\s*)([-*])\s(.*)$/
const QUOTE_ITEM_PATTERN = /^(\s*)>\s?(.*)$/

// URLs des images uploadées pendant cette session d'édition. Le parent s'en sert
// après un enregistrement réussi pour supprimer celles absentes du contenu final.
const sessionUploads = ref([])

defineExpose({
  getSessionUploads: () => sessionUploads.value,
  clearSessionUploads: () => {
    sessionUploads.value = []
  }
})

function onInput(event) {
  emit('update:modelValue', event.target.value)
}

// Position courante du curseur, avec repli en fin de texte si la zone n'est pas montée.
function currentSelection() {
  const el = textarea.value
  const fallback = props.modelValue.length
  return {
    start: el ? el.selectionStart : fallback,
    end: el ? el.selectionEnd : fallback
  }
}

// Met à jour la valeur en conservant la position de défilement du champ.
// Réaffecter la valeur d'un textarea remet son scrollTop à zéro : sans cette
// sauvegarde, la vue remonte en haut du texte à chaque bouton de la barre d'outils.
function updateValue(next, afterUpdate) {
  const scrollTop = textarea.value ? textarea.value.scrollTop : 0
  emit('update:modelValue', next)
  nextTick(() => {
    const el = textarea.value
    if (!el) {
      return
    }
    if (afterUpdate) {
      afterUpdate(el)
    }
    el.scrollTop = scrollTop
  })
}

// Remplace une portion du texte et repositionne le curseur.
// selectionStart et selectionLength permettent de laisser sélectionné le morceau
// que l'utilisateur va vouloir remplacer tout de suite (un libellé, une URL).
function replaceRange(start, end, snippet, selectionStart, selectionLength) {
  const next = props.modelValue.slice(0, start) + snippet + props.modelValue.slice(end)
  const from = selectionStart != null ? selectionStart : start + snippet.length
  updateValue(next, (el) => {
    // preventScroll empêche le navigateur de faire défiler la page entière
    // pour ramener le champ dans le viewport.
    el.focus({preventScroll: true})
    el.setSelectionRange(from, from + (selectionLength || 0))
  })
}

// Insère un texte à la position du curseur, puis replace le curseur juste après.
function insertAtCursor(snippet, caretOffset) {
  const {start, end} = currentSelection()
  const caret = start + (caretOffset != null ? caretOffset : snippet.length)
  replaceRange(start, end, snippet, caret, 0)
}

// Entoure la sélection d'un marqueur. Sans sélection, insère un texte d'exemple
// et le laisse sélectionné pour que l'utilisateur écrive par dessus.
function wrapSelection(before, after, placeholder) {
  const {start, end} = currentSelection()
  const selected = props.modelValue.slice(start, end)
  const text = selected || placeholder
  replaceRange(start, end, before + text + after, start + before.length, text.length)
}

// Délimite le bloc de lignes couvert par la sélection courante.
function selectedLines() {
  const value = props.modelValue
  const {start, end} = currentSelection()
  const lineStart = value.lastIndexOf('\n', start - 1) + 1
  const foundEnd = value.indexOf('\n', end)
  const lineEnd = foundEnd === -1 ? value.length : foundEnd
  return {lineStart, lineEnd, lines: value.slice(lineStart, lineEnd).split('\n')}
}

function applyToLines(lineStart, lineEnd, lines) {
  const next = lines.join('\n')
  replaceRange(lineStart, lineEnd, next, lineStart, next.length)
}

// Retire tout marqueur de liste, pour qu'un changement de type de liste ne les empile pas.
function stripListMarkers(line) {
  return line.replace(ORDERED_PREFIX_PATTERN, '$1').replace(BULLET_PREFIX_PATTERN, '$1')
}

// Bascule un niveau de titre. Un titre existant est d'abord retiré : appliquer
// « ## » sur une ligne en « # » donne « ## » et non « ## # ».
function toggleHeading(level) {
  const prefix = '#'.repeat(level) + ' '
  const {lineStart, lineEnd, lines} = selectedLines()
  const alreadyAtLevel = lines.every((line) => line.startsWith(prefix))
  const next = lines.map((line) => {
    const bare = line.replace(HEADING_PREFIX_PATTERN, '')
    return alreadyAtLevel ? bare : prefix + bare
  })
  applyToLines(lineStart, lineEnd, next)
}

function toggleBulletList() {
  const {lineStart, lineEnd, lines} = selectedLines()
  const allBulleted = lines.every((line) => BULLET_PREFIX_PATTERN.test(line))
  const next = lines.map((line) => (allBulleted ? stripListMarkers(line) : `- ${stripListMarkers(line)}`))
  applyToLines(lineStart, lineEnd, next)
}

// La numérotation reprend celle de la ligne précédente quand la sélection
// prolonge une liste déjà commencée.
function toggleOrderedList() {
  const {lineStart, lineEnd, lines} = selectedLines()
  const allNumbered = lines.every((line) => ORDERED_PREFIX_PATTERN.test(line))
  const offset = allNumbered ? 0 : previousOrderedNumber(lineStart)
  const next = lines.map((line, rank) =>
    allNumbered ? stripListMarkers(line) : `${offset + rank + 1}. ${stripListMarkers(line)}`)
  applyToLines(lineStart, lineEnd, next)
}

// Numéro porté par la ligne juste au dessus du bloc, ou 0 s'il n'y en a pas.
function previousOrderedNumber(lineStart) {
  if (lineStart === 0) {
    return 0
  }
  const value = props.modelValue
  const previousStart = value.lastIndexOf('\n', lineStart - 2) + 1
  const match = ORDERED_ITEM_PATTERN.exec(value.slice(previousStart, lineStart - 1))
  return match ? Number(match[2]) : 0
}

function toggleQuote() {
  const {lineStart, lineEnd, lines} = selectedLines()
  const allQuoted = lines.every((line) => QUOTE_PREFIX_PATTERN.test(line))
  const next = lines.map((line) => (allQuoted ? line.replace(QUOTE_PREFIX_PATTERN, '$1') : `> ${line}`))
  applyToLines(lineStart, lineEnd, next)
}

// Insère un bloc sur ses propres lignes, en ajoutant le saut de ligne manquant.
function insertBlock(snippet) {
  const value = props.modelValue
  const {start, end} = currentSelection()
  const needsLeadingBreak = start > 0 && value[start - 1] !== '\n'
  const text = (needsLeadingBreak ? '\n' : '') + snippet
  replaceRange(start, end, text, start + text.length, 0)
}

function applyBold() {
  wrapSelection('**', '**', 'texte en gras')
}

function applyItalic() {
  wrapSelection('*', '*', 'texte en italique')
}

function applyInlineCode() {
  wrapSelection('`', '`', 'code')
}

function applyCodeBlock() {
  const {start, end} = currentSelection()
  const selected = props.modelValue.slice(start, end)
  insertBlock('```\n' + (selected || 'votre code') + '\n```\n')
}

function applyLink() {
  const {start, end} = currentSelection()
  const selected = props.modelValue.slice(start, end)
  const text = selected || 'texte du lien'
  const snippet = `[${text}](url)`
  // On laisse "url" sélectionné : c'est ce que l'utilisateur remplace en premier.
  replaceRange(start, end, snippet, start + snippet.length - 4, 3)
}

function applyTable() {
  insertBlock('| Colonne 1 | Colonne 2 |\n| --- | --- |\n| Valeur 1 | Valeur 2 |\n')
}

// Poursuit la liste ou la citation en cours quand l'utilisateur valide une ligne.
// Si l'élément courant est vide, le marqueur est retiré : c'est ainsi qu'on sort
// d'une liste, comme dans la plupart des éditeurs.
function continueBlockOnEnter() {
  const el = textarea.value
  const {start, end} = currentSelection()
  if (!el || start !== end) {
    return false
  }

  const value = props.modelValue
  const lineStart = value.lastIndexOf('\n', start - 1) + 1
  const line = value.slice(lineStart, start)

  const ordered = ORDERED_ITEM_PATTERN.exec(line)
  if (ordered) {
    return continueOrExit(ordered[3], lineStart, start, `\n${ordered[1]}${Number(ordered[2]) + 1}. `)
  }

  const bullet = BULLET_ITEM_PATTERN.exec(line)
  if (bullet) {
    return continueOrExit(bullet[3], lineStart, start, `\n${bullet[1]}${bullet[2]} `)
  }

  const quote = QUOTE_ITEM_PATTERN.exec(line)
  if (quote) {
    return continueOrExit(quote[2], lineStart, start, `\n${quote[1]}> `)
  }

  return false
}

/**
 * Prolonge le bloc si l'élément courant a du contenu, sinon efface son marqueur.
 *
 * @param content le texte de l'élément courant, hors marqueur
 * @param lineStart le début de la ligne courante
 * @param caret la position du curseur
 * @param nextMarker le marqueur à insérer pour l'élément suivant
 */
function continueOrExit(content, lineStart, caret, nextMarker) {
  if (content.trim()) {
    replaceRange(caret, caret, nextMarker)
  } else {
    replaceRange(lineStart, caret, '', lineStart, 0)
  }
  return true
}

function onKeydown(event) {
  if (event.key === 'Enter' && !event.shiftKey && !event.ctrlKey && !event.metaKey && continueBlockOnEnter()) {
    event.preventDefault()
    return
  }
  if (!(event.ctrlKey || event.metaKey) || event.altKey) {
    return
  }
  const shortcuts = {b: applyBold, i: applyItalic, k: applyLink}
  const action = shortcuts[event.key.toLowerCase()]
  if (action) {
    event.preventDefault()
    action()
  }
}

function openImagePicker() {
  imageInput.value?.click()
}

// Extrait les fichiers image d'un presse-papiers ou d'un glisser-déposer.
// Coller depuis un traitement de texte ou une page web ne donne parfois qu'une
// référence HTML sans fichier : il n'y a alors rien à envoyer.
function imageFilesFrom(dataTransfer) {
  if (!dataTransfer) {
    return []
  }
  const fromItems = Array.from(dataTransfer.items || [])
    .filter((item) => item.kind === 'file')
    .map((item) => item.getAsFile())
    .filter((file) => file && file.type.startsWith('image/'))

  if (fromItems.length > 0) {
    return fromItems
  }
  return Array.from(dataTransfer.files || []).filter((file) => file.type.startsWith('image/'))
}

let uploadCounter = 0

// Remplace le jeton d'attente par le résultat de l'envoi. Le remplacement se fait
// sur le texte, pas sur une position : l'utilisateur a pu continuer à écrire.
function replaceToken(token, replacement) {
  if (!props.modelValue.includes(token)) {
    return
  }
  updateValue(props.modelValue.replace(token, replacement))
}

// Envoie les images une par une pour garder l'ordre d'insertion et ne pas
// saturer l'API. Chaque attente laisse la valeur du parent redescendre en props.
async function uploadImages(files) {
  if (files.length === 0) {
    return
  }
  imageError.value = ''
  uploadingImage.value = true
  try {
    for (const file of files) {
      const validationError = validateImageFile(file)
      if (validationError) {
        imageError.value = validationError
        continue
      }

      uploadCounter += 1
      const token = `![Envoi en cours ${uploadCounter}...]()`
      insertAtCursor(token)
      await nextTick()

      try {
        const media = await mediaService.uploadImage(file, MEDIA_USAGE.CONTENT)
        sessionUploads.value.push(media.url)
        replaceToken(token, `![](${media.url})`)
      } catch (err) {
        imageError.value = err.message || "L'envoi de l'image a échoué."
        replaceToken(token, '')
      }
      await nextTick()
    }
  } finally {
    uploadingImage.value = false
  }
}

async function onImageSelected(event) {
  const files = Array.from(event.target.files || [])
  event.target.value = ''
  await uploadImages(files)
}

async function onPaste(event) {
  const images = imageFilesFrom(event.clipboardData)
  if (images.length === 0) {
    return
  }
  // Sans cela, le navigateur collerait aussi sa propre représentation de l'image.
  event.preventDefault()
  await uploadImages(images)
}

function onDragOver() {
  dragging.value = true
}

function onDragLeave() {
  dragging.value = false
}

async function onDrop(event) {
  dragging.value = false
  const images = imageFilesFrom(event.dataTransfer)
  if (images.length === 0) {
    return
  }
  await uploadImages(images)
}
</script>

<template>
  <div class="border border-input rounded-[10px] overflow-hidden">
    <!-- Onglets et actions -->
    <div class="flex items-center justify-between border-b border-line bg-surface-tint px-2 py-1.5 gap-2">
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
        <button
          type="button"
          class="px-3 py-1 rounded-md text-[13px] font-semibold hidden lg:flex items-center gap-1.5 transition-colors"
          :class="mode === 'split' ? 'bg-white text-primary shadow-sm' : 'text-ink-soft hover:text-ink'"
          @click="mode = 'split'"
        >
          <Icon name="vertical_split" :size="16"/>
          Côte à côte
        </button>
      </div>

      <label :for="imageInputId" class="sr-only">Images à insérer dans le contenu</label>
      <input
        :id="imageInputId"
        ref="imageInput"
        type="file"
        multiple
        :accept="ALLOWED_IMAGE_ACCEPT"
        class="hidden"
        @change="onImageSelected"
      />
      <button
        v-if="showEditor"
        type="button"
        :disabled="uploadingImage"
        class="px-3 py-1 rounded-md text-[13px] font-semibold flex items-center gap-1.5 text-ink-soft hover:text-primary transition-colors disabled:opacity-60"
        @click="openImagePicker"
      >
        <Icon name="image" :size="16"/>
        {{ uploadingImage ? 'Envoi...' : 'Image' }}
      </button>
    </div>

    <!-- Barre de mise en forme -->
    <div v-if="showEditor" class="flex items-center flex-wrap gap-0.5 border-b border-line bg-surface px-2 py-1">
      <button type="button" title="Gras (Ctrl+B)" aria-label="Gras"
              class="p-1.5 rounded-md text-ink-soft hover:text-primary hover:bg-surface-tint transition-colors"
              @click="applyBold">
        <Icon name="format_bold" :size="18"/>
      </button>
      <button type="button" title="Italique (Ctrl+I)" aria-label="Italique"
              class="p-1.5 rounded-md text-ink-soft hover:text-primary hover:bg-surface-tint transition-colors"
              @click="applyItalic">
        <Icon name="format_italic" :size="18"/>
      </button>

      <span class="w-px h-5 bg-line mx-1" aria-hidden="true"></span>

      <button type="button" title="Titre de niveau 1" aria-label="Titre de niveau 1"
              class="p-1.5 rounded-md text-ink-soft hover:text-primary hover:bg-surface-tint transition-colors"
              @click="toggleHeading(1)">
        <Icon name="format_h1" :size="18"/>
      </button>
      <button type="button" title="Titre de niveau 2" aria-label="Titre de niveau 2"
              class="p-1.5 rounded-md text-ink-soft hover:text-primary hover:bg-surface-tint transition-colors"
              @click="toggleHeading(2)">
        <Icon name="format_h2" :size="18"/>
      </button>
      <button type="button" title="Titre de niveau 3" aria-label="Titre de niveau 3"
              class="p-1.5 rounded-md text-ink-soft hover:text-primary hover:bg-surface-tint transition-colors"
              @click="toggleHeading(3)">
        <Icon name="format_h3" :size="18"/>
      </button>

      <span class="w-px h-5 bg-line mx-1" aria-hidden="true"></span>

      <button type="button" title="Liste à puces" aria-label="Liste à puces"
              class="p-1.5 rounded-md text-ink-soft hover:text-primary hover:bg-surface-tint transition-colors"
              @click="toggleBulletList">
        <Icon name="format_list_bulleted" :size="18"/>
      </button>
      <button type="button" title="Liste numérotée" aria-label="Liste numérotée"
              class="p-1.5 rounded-md text-ink-soft hover:text-primary hover:bg-surface-tint transition-colors"
              @click="toggleOrderedList">
        <Icon name="format_list_numbered" :size="18"/>
      </button>
      <button type="button" title="Citation" aria-label="Citation"
              class="p-1.5 rounded-md text-ink-soft hover:text-primary hover:bg-surface-tint transition-colors"
              @click="toggleQuote">
        <Icon name="format_quote" :size="18"/>
      </button>

      <span class="w-px h-5 bg-line mx-1" aria-hidden="true"></span>

      <button type="button" title="Code en ligne" aria-label="Code en ligne"
              class="p-1.5 rounded-md text-ink-soft hover:text-primary hover:bg-surface-tint transition-colors"
              @click="applyInlineCode">
        <Icon name="code" :size="18"/>
      </button>
      <button type="button" title="Bloc de code" aria-label="Bloc de code"
              class="p-1.5 rounded-md text-ink-soft hover:text-primary hover:bg-surface-tint transition-colors"
              @click="applyCodeBlock">
        <Icon name="code_blocks" :size="18"/>
      </button>
      <button type="button" title="Lien (Ctrl+K)" aria-label="Lien"
              class="p-1.5 rounded-md text-ink-soft hover:text-primary hover:bg-surface-tint transition-colors"
              @click="applyLink">
        <Icon name="link" :size="18"/>
      </button>
      <button type="button" title="Tableau" aria-label="Tableau"
              class="p-1.5 rounded-md text-ink-soft hover:text-primary hover:bg-surface-tint transition-colors"
              @click="applyTable">
        <Icon name="table" :size="18"/>
      </button>
    </div>

    <!-- Saisie et aperçu -->
    <div :class="mode === 'split' ? 'grid lg:grid-cols-2 lg:divide-x lg:divide-line' : ''">
      <div v-if="showEditor" class="relative">
        <textarea
          :id="textareaId"
          ref="textarea"
          :value="modelValue"
          :rows="rows"
          placeholder="Rédigez en Markdown..."
          class="w-full px-4 py-3 text-[14px] text-ink font-mono leading-relaxed focus:outline-none resize-y transition-colors"
          :class="dragging ? 'bg-primary/5' : ''"
          @input="onInput"
          @keydown="onKeydown"
          @paste="onPaste"
          @dragover.prevent="onDragOver"
          @dragleave="onDragLeave"
          @drop.prevent="onDrop"
        ></textarea>
        <div
          v-if="dragging"
          class="absolute inset-2 rounded-[8px] border-2 border-dashed border-primary flex items-center justify-center pointer-events-none"
        >
          <span class="text-[13px] font-semibold text-primary bg-surface px-3 py-1 rounded-full">
            Déposez vos images ici
          </span>
        </div>
      </div>

      <div v-if="showPreview" class="px-4 py-3 min-h-[200px]">
        <MarkdownContent v-if="modelValue.trim()" :source="modelValue"/>
        <p v-else class="text-[14px] text-muted">Rien à prévisualiser pour le moment.</p>
      </div>
    </div>
  </div>

  <p v-if="imageError" class="text-[12px] text-danger mt-1.5">{{ imageError }}</p>
  <p class="text-[12px] text-muted mt-1.5">
    Markdown supporté : titres (#), listes (-), gras (**texte**), code en ligne et blocs, images, liens, tableaux.
    Entrée poursuit une liste, une ligne vide en sort. Vous pouvez coller une capture d'écran
    ou déposer vos images directement dans la zone de saisie.
  </p>
</template>
