<script setup>
import {computed} from 'vue'
import {iconPath} from '@/icons'

const props = defineProps({
  name: {type: String, required: true},
  size: {type: [Number, String], default: 24}
})

const path = computed(() => iconPath(props.name))
</script>

<!--
  L'icône est décorative : le texte ou l'aria-label de l'élément parent porte le sens.
  La taille passe par font-size et le SVG mesure 1em, comme l'ancienne police d'icônes.
-->
<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 -960 960 960"
    width="1em"
    height="1em"
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
    class="inline-block shrink-0 align-middle"
    :style="{ fontSize: size + 'px' }"
  >
    <path :d="path"/>
  </svg>
</template>
