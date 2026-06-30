<script setup>
// Cover par défaut affichée pour un bloc qui n'a pas d'image personnalisée.
import defaultCover from '@/assets/default-block-cover.png'

defineProps({
  height: {type: [Number, String], default: 200}
})
</script>

<template>
  <div
    class="w-full bg-primary-dark overflow-hidden"
    :style="{ height: typeof height === 'number' ? height + 'px' : height }"
  >
    <img :src="defaultCover" alt="" class="w-full h-full object-cover"/>
  </div>
</template>
