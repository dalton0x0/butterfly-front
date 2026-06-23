<script setup>
// Fil d'Ariane. On lui passe un tableau d'items { label, to? }.
import Icon from './Icon.vue'

defineProps({
  items: {type: Array, default: () => []}
})
</script>

<template>
  <nav class="mb-6 flex items-center flex-wrap text-[13px] text-ink-soft">
    <template v-for="(item, index) in items" :key="index">
      <RouterLink v-if="item.to && index < items.length - 1" :to="item.to" class="hover:text-primary transition-colors">
        {{ item.label }}
      </RouterLink>
      <span v-else class="text-ink">{{ item.label }}</span>
      <Icon v-if="index < items.length - 1" name="chevron_right" :size="16" class="mx-1.5 text-muted"/>
    </template>
  </nav>
</template>
