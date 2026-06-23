<script setup>
// Page 404 : message clair et invitation à revenir au tableau de bord.
import Icon from '@/components/Icon.vue'
</script>

<template>
  <div class="flex flex-col items-center justify-center text-center py-20">
    <div class="w-20 h-20 rounded-full bg-surface-tint flex items-center justify-center text-primary mb-6">
      <Icon name="travel_explore" :size="44"/>
    </div>
    <h1 class="text-[30px] font-semibold text-navy mb-2">Page introuvable</h1>
    <p class="text-ink-soft mb-6">La page que vous cherchez n'existe pas ou a été déplacée.</p>
    <RouterLink to="/"
                class="h-10 px-5 rounded-[10px] bg-primary text-white text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity">
      <Icon name="home" :size="18"/>
      Retour au tableau de bord
    </RouterLink>
  </div>
</template>
