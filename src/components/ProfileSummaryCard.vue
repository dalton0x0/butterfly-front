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
  <div class="bg-surface rounded-2xl shadow-[var(--shadow-card)] p-6 flex flex-col items-center text-center">
    <div class="w-24 h-24 rounded-full bg-surface-tint flex items-center justify-center text-primary overflow-hidden">
      <img v-if="auth.user?.avatar" :src="mediaUrl(auth.user.avatar)" alt="Avatar"
           class="w-full h-full object-cover"/>
      <Icon v-else name="account_circle" :size="64"/>
    </div>
    <h3 class="text-[17px] font-semibold text-ink mt-4">{{ auth.fullName }}</h3>
    <p class="text-[13px] text-muted">{{ auth.user?.email }}</p>
    <div class="flex gap-2 mt-3 flex-wrap justify-center">
      <StatusChip :label="roleLabel" :variant="roleVariant"/>
      <StatusChip v-if="auth.user?.promotionName" :label="auth.user.promotionName" variant="neutral"/>
    </div>
    <p v-if="memberSince" class="text-[13px] text-muted mt-3">Membre depuis {{ memberSince }}</p>
  </div>
</template>
