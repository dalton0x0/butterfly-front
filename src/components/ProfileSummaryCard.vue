<script setup>
// Carte d'identité de l'utilisateur connecté, en lecture seule.
import {computed} from 'vue'
import {mediaUrl} from '@/utils/media'
import Icon from '@/components/Icon.vue'
import StatusChip from '@/components/StatusChip.vue'
import {useAuthStore} from '@/stores/auth'

const auth = useAuthStore()

const ROLE_LABELS = {USER: 'Apprenant', TEACHER: 'Formateur', ADMIN: 'Administrateur'}
const ROLE_VARIANTS = {USER: 'primary', TEACHER: 'success', ADMIN: 'warning'}
const roleLabel = computed(() => ROLE_LABELS[auth.user?.role] || auth.user?.role || '')
const roleVariant = computed(() => ROLE_VARIANTS[auth.user?.role] || 'neutral')
const memberSince = computed(() => {
  const raw = auth.user?.createdAt
  if (!raw) {
    return ''
  }
  const date = new Date(raw)
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString('fr-FR', {month: 'long', year: 'numeric'})
})
</script>

<template>
  <!-- En-tête horizontal, sur le modèle de la fiche utilisateur côté administration -->
  <div class="bg-surface rounded-2xl shadow-[var(--shadow-card)] p-6">
    <div class="flex flex-col sm:flex-row sm:items-center gap-5">
      <div class="w-[72px] h-[72px] shrink-0 rounded-full bg-surface-tint flex items-center justify-center text-primary overflow-hidden">
        <img v-if="auth.user?.avatar" :src="mediaUrl(auth.user.avatar)" alt="Avatar"
             class="w-full h-full object-cover"/>
        <Icon v-else name="account_circle" :size="56"/>
      </div>
      <div class="flex-1 min-w-0">
        <h1 class="text-[26px] font-semibold text-navy truncate">{{ auth.fullName }}</h1>
        <p class="text-ink-soft truncate">{{ auth.user?.email }}</p>
        <div class="flex flex-wrap items-center gap-2 mt-2">
          <StatusChip :label="roleLabel" :variant="roleVariant"/>
          <StatusChip v-if="auth.user?.promotionName" :label="auth.user.promotionName" variant="neutral"/>
          <span v-if="memberSince" class="text-[13px] text-muted">Membre depuis {{ memberSince }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
