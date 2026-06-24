<script setup>
// Avatar réutilisable : affiche l'image de l'utilisateur si elle existe,
// sinon ses initiales, sinon une icône générique.
import {computed} from 'vue'
import {mediaUrl} from '@/utils/media'
import Icon from './Icon.vue'

const props = defineProps({
  // Valeur stockée côté back (chemin relatif ou URL externe).
  src: {type: String, default: ''},
  // Nom complet, sert au calcul des initiales de repli.
  name: {type: String, default: ''},
  // Diamètre en pixels.
  size: {type: Number, default: 40}
})

const resolvedSrc = computed(() => (props.src ? mediaUrl(props.src) : ''))

const initials = computed(() => {
  const parts = (props.name || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) {
    return ''
  }
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase()
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
})

const iconSize = computed(() => Math.round(props.size * 0.55))
const fontSize = computed(() => Math.round(props.size * 0.4))
</script>

<template>
  <span
    class="inline-flex items-center justify-center rounded-full overflow-hidden bg-surface-tint text-primary font-semibold shrink-0"
    :style="{ width: `${size}px`, height: `${size}px`, fontSize: `${fontSize}px` }"
  >
    <img v-if="resolvedSrc" :src="resolvedSrc" :alt="name" class="w-full h-full object-cover"/>
    <template v-else-if="initials">{{ initials }}</template>
    <Icon v-else name="person" :size="iconSize"/>
  </span>
</template>
