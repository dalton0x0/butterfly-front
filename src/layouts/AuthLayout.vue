<script setup>
// Layout des pages d'authentification
import Icon from '@/components/Icon.vue'
import config from "../utils/config.js";
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <header class="fixed top-0 left-0 w-full z-50 bg-primary-dark h-16 flex items-center px-6">
      <div class="flex items-center gap-2 text-white font-bold text-[17px]">
        <Icon name="verified" filled/>
        {{ config.appName }}
      </div>
    </header>
    <main class="flex-1 flex items-center justify-center pt-16 px-4">
      <slot/>
    </main>
  </div>
</template>
