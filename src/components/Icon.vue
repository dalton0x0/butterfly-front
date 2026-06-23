<script setup>
defineProps({
  name: {type: String, required: true},
  filled: {type: Boolean, default: false},
  size: {type: [Number, String], default: 24}
})
</script>

<template>
  <span
      class="material-symbols-outlined"
      :class="{ 'icon-filled': filled }"
      :style="{ fontSize: size + 'px' }"
  >
    {{ name }}
  </span>
</template>
