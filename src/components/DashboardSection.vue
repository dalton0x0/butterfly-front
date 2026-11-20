<script setup>
// Carte d'un tableau de bord : un titre, un sous-titre facultatif, un lien d'action à
// droite (slot « action ») et le contenu. Toutes les cartes des tableaux de bord
// partagent ainsi le même en-tête.
defineProps({
  title: {type: String, required: true},
  subtitle: {type: String, default: ''}
})
</script>

<template>
  <section class="bg-surface rounded-2xl shadow-[var(--shadow-card)] p-5 min-w-0">
    <div class="flex items-start justify-between gap-3 mb-4">
      <div class="min-w-0">
        <h2 class="text-[17px] font-semibold text-ink">{{ title }}</h2>
        <p v-if="subtitle" class="text-[13px] text-ink-soft">{{ subtitle }}</p>
      </div>
      <div v-if="$slots.action" class="shrink-0 text-[13px] font-semibold">
        <slot name="action"/>
      </div>
    </div>
    <slot/>
  </section>
</template>
