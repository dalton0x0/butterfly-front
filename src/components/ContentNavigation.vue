<script setup>
// Navigation précédent / suivant en bas d'un cours ou d'un exercice.
//
// Le composant ne charge rien : la vue lui passe les voisins calculés par
// useModuleNavigation. Un voisin verrouillé reste affiché mais n'est pas cliquable,
// l'apprenant sait ainsi ce qui l'attend et pourquoi il ne peut pas encore y aller.
//
// Le verrou s'applique des deux côtés. Les cours d'un module ne sont jamais verrouillés
// mais un exercice peut l'être : depuis le cours qui le suit, l'exercice verrouillé est
// l'élément précédent.
import {computed} from 'vue'
import Icon from './Icon.vue'
import {contentKindLabel, contentRoute} from '@/utils/moduleSequence'

const props = defineProps({
  previous: {type: Object, default: null},
  next: {type: Object, default: null},
  // Sert au lien de fin de module quand il n'y a plus d'élément suivant.
  moduleId: {type: Number, default: null}
})

const LOCK_HINT = 'Terminez les cours qui le précèdent pour le débloquer.'

/**
 * Décrit une carte de navigation à partir d'un voisin.
 * Le même calcul sert aux deux côtés : seuls le libellé et le sens changent.
 */
function describe(item, direction) {
  if (!item) {
    return null
  }
  const kind = contentKindLabel(item)
  return {
    key: `${item._type}-${item.id}`,
    name: item.name,
    locked: Boolean(item.locked),
    label: item.locked ? `${direction} · ${kind} verrouillé` : `${direction} · ${kind}`,
    to: item.locked ? undefined : contentRoute(item)
  }
}

const previousCard = computed(() => describe(props.previous, 'Précédent'))
const nextCard = computed(() => describe(props.next, 'Suivant'))

const CARD_CLASS = 'bg-surface rounded-2xl shadow-[var(--shadow-card)] px-5 py-4 flex items-center gap-3 transition-colors'
const STATE_CLASS = {
  locked: 'opacity-60 cursor-not-allowed',
  open: 'hover:bg-surface-hover'
}
</script>

<template>
  <nav aria-label="Navigation dans le module" class="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
    <!-- Précédent : lien, ou bloc inerte s'il est verrouillé -->
    <component
      :is="previousCard.locked ? 'div' : 'RouterLink'"
      v-if="previousCard"
      :to="previousCard.to"
      :aria-disabled="previousCard.locked ? 'true' : undefined"
      :class="[CARD_CLASS, previousCard.locked ? STATE_CLASS.locked : STATE_CLASS.open]"
    >
      <Icon :name="previousCard.locked ? 'lock' : 'arrow_back'" :size="20"
            :class="previousCard.locked ? 'text-muted' : 'text-primary'" class="shrink-0"/>
      <span class="min-w-0">
        <span class="block text-[12px] text-muted">{{ previousCard.label }}</span>
        <span class="block text-[15px] text-ink font-medium truncate">{{ previousCard.name }}</span>
        <span v-if="previousCard.locked" class="block text-[12px] text-muted">{{ LOCK_HINT }}</span>
      </span>
    </component>
    <span v-else class="hidden sm:block"></span>

    <!-- Suivant : lien, ou bloc inerte s'il est verrouillé -->
    <component
      :is="nextCard.locked ? 'div' : 'RouterLink'"
      v-if="nextCard"
      :to="nextCard.to"
      :aria-disabled="nextCard.locked ? 'true' : undefined"
      :class="[CARD_CLASS, 'justify-end text-right', nextCard.locked ? STATE_CLASS.locked : STATE_CLASS.open]"
    >
      <span class="min-w-0">
        <span class="block text-[12px] text-muted">{{ nextCard.label }}</span>
        <span class="block text-[15px] text-ink font-medium truncate">{{ nextCard.name }}</span>
        <span v-if="nextCard.locked" class="block text-[12px] text-muted">{{ LOCK_HINT }}</span>
      </span>
      <Icon :name="nextCard.locked ? 'lock' : 'arrow_forward'" :size="20"
            :class="nextCard.locked ? 'text-muted' : 'text-primary'" class="shrink-0"/>
    </component>

    <!-- Fin du module -->
    <RouterLink
      v-else-if="moduleId"
      :to="`/modules/${moduleId}`"
      :class="[CARD_CLASS, STATE_CLASS.open, 'justify-end text-right']"
    >
      <span class="min-w-0">
        <span class="block text-[12px] text-muted">Fin du module</span>
        <span class="block text-[15px] text-ink font-medium">Retour au module</span>
      </span>
      <Icon name="flag" :size="20" class="text-primary shrink-0"/>
    </RouterLink>
  </nav>
</template>
