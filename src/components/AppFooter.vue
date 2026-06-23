<script setup>
// Footer identique sur toutes les pages (sauf authentification).
import Icon from './Icon.vue'
</script>

<template>
  <footer class="bg-primary-dark w-full mt-auto py-8 px-6">
    <div class="max-w-300 mx-auto grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-x-12 gap-y-8">
      <div class="flex flex-col gap-3">
        <div class="flex items-center gap-2 text-white text-[17px] font-semibold">
          <Icon name="verified" filled :size="20"/>
          InfraDev LMS
        </div>
        <p class="text-[13px] text-accent-soft">
          Plateforme d'apprentissage d'administration d'infrastructures,<br>
          du développement web et mobile<br>
          et de la cybersécurité !
        </p>
        <p class="text-[13px] text-accent-soft">© 2026 InfraDev LMS. Tous droits réservés.</p>
      </div>
      <div class="flex flex-col gap-2">
        <span class="text-white text-sm font-semibold mb-1">Ressources</span>
        <a href="#" class="text-[13px] text-accent-soft hover:text-white transition-colors">Documentation</a>
        <a href="#" class="text-[13px] text-accent-soft hover:text-white transition-colors">Support</a>
        <a href="#" class="text-[13px] text-accent-soft hover:text-white transition-colors">Statut</a>
      </div>
      <div class="flex flex-col gap-2">
        <span class="text-white text-sm font-semibold mb-1">Légal</span>
        <a href="#" class="text-[13px] text-accent-soft hover:text-white transition-colors">Confidentialité</a>
        <a href="#" class="text-[13px] text-accent-soft hover:text-white transition-colors">Conditions d'utilisation</a>
        <a href="#" class="text-[13px] text-accent-soft hover:text-white transition-colors">Contact</a>
      </div>
    </div>
  </footer>
</template>
