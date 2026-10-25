<script setup>
// Jauge de force d'un mot de passe : quatre barres qui se remplissent selon les critères
// satisfaits. Partagée par l'inscription, le profil et les pages de définition d'un mot
// de passe pour que la règle et son affichage restent identiques partout.
import {computed} from 'vue'
import {passwordStrength} from '@/utils/validators'

const props = defineProps({
  password: {type: String, default: ''}
})

const strength = computed(() => passwordStrength(props.password))

const strengthColor = computed(() => {
  switch (strength.value) {
    case 1:
      return 'bg-danger'
    case 2:
      return 'bg-warning'
    case 3:
      return 'bg-primary'
    case 4:
      return 'bg-success'
    default:
      return 'bg-input'
  }
})
</script>

<template>
  <div class="flex gap-1 h-1" aria-hidden="true">
    <div
      v-for="bar in 4"
      :key="bar"
      class="flex-1 rounded-full transition-colors"
      :class="bar <= strength ? strengthColor : 'bg-input'"
    ></div>
  </div>
</template>
