<script setup>
// Navigation précédent / suivant en bas d'un cours ou d'un exercice.
//
// Le composant ne charge rien : la vue lui passe les voisins calculés par
// useModuleNavigation. Un voisin verrouillé reste affiché mais n'est pas cliquable,
// l'apprenant sait ainsi ce qui l'attend et pourquoi il ne peut pas encore y aller.
import Icon from './Icon.vue'
import {contentKindLabel, contentRoute} from '@/utils/moduleSequence'

defineProps({
  previous: {type: Object, default: null},
  next: {type: Object, default: null},
  // Sert au lien de fin de module quand il n'y a plus d'élément suivant.
  moduleId: {type: Number, default: null}
})
</script>

<template>
  <nav aria-label="Navigation dans le module" class="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
    <!-- Précédent -->
    <RouterLink
      v-if="previous"
      :to="contentRoute(previous)"
      class="bg-surface rounded-2xl shadow-[var(--shadow-card)] px-5 py-4 flex items-center gap-3 hover:bg-surface-hover transition-colors"
    >
      <Icon name="arrow_back" :size="20" class="text-primary shrink-0"/>
      <span class="min-w-0">
        <span class="block text-[12px] text-muted">Précédent · {{ contentKindLabel(previous) }}</span>
        <span class="block text-[15px] text-ink font-medium truncate">{{ previous.name }}</span>
      </span>
    </RouterLink>
    <span v-else class="hidden sm:block"></span>

    <!-- Suivant verrouillé -->
    <div
      v-if="next && next.locked"
      aria-disabled="true"
      class="bg-surface rounded-2xl shadow-[var(--shadow-card)] px-5 py-4 flex items-center justify-end gap-3 text-right opacity-60 cursor-not-allowed"
    >
      <span class="min-w-0">
        <span class="block text-[12px] text-muted">Suivant · {{ contentKindLabel(next) }} verrouillé</span>
        <span class="block text-[15px] text-ink font-medium truncate">{{ next.name }}</span>
        <span class="block text-[12px] text-muted">Terminez les cours qui le précèdent pour le débloquer.</span>
      </span>
      <Icon name="lock" :size="20" class="text-muted shrink-0"/>
    </div>

    <!-- Suivant -->
    <RouterLink
      v-else-if="next"
      :to="contentRoute(next)"
      class="bg-surface rounded-2xl shadow-[var(--shadow-card)] px-5 py-4 flex items-center justify-end gap-3 text-right hover:bg-surface-hover transition-colors"
    >
      <span class="min-w-0">
        <span class="block text-[12px] text-muted">Suivant · {{ contentKindLabel(next) }}</span>
        <span class="block text-[15px] text-ink font-medium truncate">{{ next.name }}</span>
      </span>
      <Icon name="arrow_forward" :size="20" class="text-primary shrink-0"/>
    </RouterLink>

    <!-- Fin du module -->
    <RouterLink
      v-else-if="moduleId"
      :to="`/modules/${moduleId}`"
      class="bg-surface rounded-2xl shadow-[var(--shadow-card)] px-5 py-4 flex items-center justify-end gap-3 text-right hover:bg-surface-hover transition-colors"
    >
      <span class="min-w-0">
        <span class="block text-[12px] text-muted">Fin du module</span>
        <span class="block text-[15px] text-ink font-medium">Retour au module</span>
      </span>
      <Icon name="flag" :size="20" class="text-primary shrink-0"/>
    </RouterLink>
  </nav>
</template>
