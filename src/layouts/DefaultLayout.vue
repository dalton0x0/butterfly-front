<script setup>
// Layout principal.
import AppNavbar from '@/components/AppNavbar.vue'
import AppFooter from '@/components/AppFooter.vue'
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <AppNavbar />
    <main class="flex-grow pt-[88px] pb-10 px-6">
      <div class="max-w-[1200px] mx-auto w-full">
        <slot />
      </div>
    </main>
    <AppFooter />
  </div>
</template>
