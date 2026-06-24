<script setup>
// Espace admin : création d'un utilisateur. POST /api/users.
// La promotion n'est proposée que pour le rôle Apprenant (contrainte back).
import {computed, onMounted, reactive, ref} from 'vue'
import {ROLES} from '@/utils/roles'
import {useRouter} from 'vue-router'
import {userService} from '@/services/userService'
import {promotionService} from '@/services/promotionService'
import Breadcrumb from '@/components/Breadcrumb.vue'

const router = useRouter()

const form = reactive({
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  role: ROLES.USER,
  promotionId: ''
})

const promotions = ref([])
const saving = ref(false)
const error = ref('')

const isLearner = computed(() => form.role === ROLES.USER)

async function loadPromotions() {
  try {
    const page = await promotionService.getPromotions()
    promotions.value = page.items
  } catch {
    promotions.value = []
  }
}

async function submit() {
  error.value = ''
  if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim() || !form.password) {
    error.value = 'Tous les champs obligatoires doivent être renseignés.'
    return
  }
  saving.value = true
  try {
    const payload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      password: form.password,
      role: form.role
    }
    if (isLearner.value && form.promotionId !== '') {
      payload.promotionId = form.promotionId
    }
    const created = await userService.createUser(payload)
    router.push(`/admin/utilisateurs/${created.id}`)
  } catch (err) {
    error.value = err.message || "La création a échoué."
  } finally {
    saving.value = false
  }
}

onMounted(loadPromotions)
</script>

<template>
  <Breadcrumb :items="[{ label: 'Utilisateurs', to: '/admin/utilisateurs' }, { label: 'Nouvel utilisateur' }]"/>

  <h1 class="text-[30px] font-semibold text-navy mb-6">Nouvel utilisateur</h1>

  <div class="bg-surface rounded-2xl shadow-[var(--shadow-card)] p-6 max-w-2xl">
    <p v-if="error" class="text-[14px] text-danger bg-danger/8 rounded-[10px] px-4 py-2.5 mb-5">{{ error }}</p>

    <div class="flex flex-col gap-4">
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-[12px] font-semibold text-muted uppercase tracking-wide mb-1.5">Prénom</label>
          <input v-model="form.firstName"
                 class="w-full h-10 px-3 border border-input rounded-[10px] text-[14px] text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"/>
        </div>
        <div>
          <label class="block text-[12px] font-semibold text-muted uppercase tracking-wide mb-1.5">Nom</label>
          <input v-model="form.lastName"
                 class="w-full h-10 px-3 border border-input rounded-[10px] text-[14px] text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"/>
        </div>
      </div>

      <div>
        <label class="block text-[12px] font-semibold text-muted uppercase tracking-wide mb-1.5">E-mail</label>
        <input v-model="form.email" type="email"
               class="w-full h-10 px-3 border border-input rounded-[10px] text-[14px] text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"/>
      </div>

      <div>
        <label class="block text-[12px] font-semibold text-muted uppercase tracking-wide mb-1.5">Mot de passe</label>
        <input v-model="form.password" type="password"
               class="w-full h-10 px-3 border border-input rounded-[10px] text-[14px] text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"/>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-[12px] font-semibold text-muted uppercase tracking-wide mb-1.5">Rôle</label>
          <select v-model="form.role"
                  class="w-full h-10 px-3 border border-input rounded-[10px] text-[14px] text-ink bg-white">
            <option value="USER">Apprenant</option>
            <option value="TEACHER">Formateur</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
        <div v-if="isLearner">
          <label class="block text-[12px] font-semibold text-muted uppercase tracking-wide mb-1.5">Promotion
            (facultatif)</label>
          <select v-model="form.promotionId"
                  class="w-full h-10 px-3 border border-input rounded-[10px] text-[14px] text-ink bg-white">
            <option value="">Aucune</option>
            <option v-for="p in promotions" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
        </div>
      </div>

      <div class="flex justify-end gap-3 mt-2">
        <RouterLink to="/admin/utilisateurs"
                    class="h-10 px-5 rounded-[10px] border border-line text-ink-soft text-sm font-semibold hover:bg-surface-tint transition-colors flex items-center">
          Annuler
        </RouterLink>
        <button :disabled="saving"
                class="h-10 px-5 rounded-[10px] bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
                @click="submit">
          Créer l'utilisateur
        </button>
      </div>
    </div>
  </div>
</template>
