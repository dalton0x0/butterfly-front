<script setup>
// Inscription.
import {ref, reactive, computed} from 'vue'
import {useRouter} from 'vue-router'
import {useAuthStore} from '@/stores/auth'
import {
  validateRequired,
  validateEmail,
  validatePassword,
  validateMatch,
  passwordStrength,
  mapBackendError
} from '@/utils/validators'
import Icon from '@/components/Icon.vue'

const router = useRouter()
const auth = useAuthStore()

const showPassword = ref(false)

const form = reactive({
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  confirmPassword: ''
})
const errors = reactive({
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  confirmPassword: '',
  global: ''
})

// Force du mot de passe (0 à 4) et habillage de la jauge.
const strength = computed(() => passwordStrength(form.password))
const strengthColor = computed(() => {
  switch (strength.value) {
    case 1:
      return 'bg-danger'
    case 2:
      return 'bg-warning'
    case 3:
      return 'bg-primary'
    case 4:
      return 'bg-success'
    default:
      return 'bg-input'
  }
})

function clearError(field) {
  errors[field] = ''
  errors.global = ''
}

function validate() {
  errors.firstName = validateRequired(form.firstName, 'Le prénom est obligatoire.')
  errors.lastName = validateRequired(form.lastName, 'Le nom est obligatoire.')
  errors.email = validateEmail(form.email)
  errors.password = validatePassword(form.password)
  errors.confirmPassword = validateMatch(form.password, form.confirmPassword)
  return (
      !errors.firstName &&
      !errors.lastName &&
      !errors.email &&
      !errors.password &&
      !errors.confirmPassword
  )
}

async function handleRegister() {
  errors.global = ''
  if (!validate()) {
    return
  }
  try {
    await auth.register({
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      password: form.password
    })
    router.push('/')
  } catch (err) {
    const {fieldErrors, globalError} = mapBackendError(err, {
      knownFields: ['firstName', 'lastName', 'email', 'password']
    })
    Object.assign(errors, fieldErrors)
    errors.global = globalError
  }
}
</script>

<template>
  <div class="bg-surface w-full max-w-[480px] rounded-2xl p-10 shadow-[var(--shadow-card)]">
    <div class="text-center mb-6">
      <div class="inline-flex w-12 h-12 rounded-full bg-surface-tint items-center justify-center mb-4 text-primary">
        <Icon name="person_add" :size="28"/>
      </div>
      <h2 class="text-[22px] font-semibold text-navy mb-1">Créer un compte</h2>
      <p class="text-[13px] text-muted">Rejoignez la plateforme InfraDev</p>
    </div>

    <form class="flex flex-col gap-5" @submit.prevent="handleRegister" novalidate>
      <!-- Erreur globale éventuelle renvoyée par le back -->
      <p v-if="errors.global" class="text-[13px] text-danger bg-danger/8 rounded-[10px] px-3 py-2">{{
          errors.global
        }}</p>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-[13px] text-ink-soft mb-1">Prénom</label>
          <input
              v-model="form.firstName"
              @input="clearError('firstName')"
              placeholder="Jean"
              class="w-full h-10 px-3 border rounded-[10px] text-[15px] focus:outline-none focus:ring-1 transition-colors"
              :class="errors.firstName ? 'border-danger focus:border-danger focus:ring-danger' : 'border-input focus:border-primary focus:ring-primary'"
          />
          <p v-if="errors.firstName" class="text-[12px] text-danger mt-1">{{ errors.firstName }}</p>
        </div>
        <div>
          <label class="block text-[13px] text-ink-soft mb-1">Nom</label>
          <input
              v-model="form.lastName"
              @input="clearError('lastName')"
              placeholder="Dupont"
              class="w-full h-10 px-3 border rounded-[10px] text-[15px] focus:outline-none focus:ring-1 transition-colors"
              :class="errors.lastName ? 'border-danger focus:border-danger focus:ring-danger' : 'border-input focus:border-primary focus:ring-primary'"
          />
          <p v-if="errors.lastName" class="text-[12px] text-danger mt-1">{{ errors.lastName }}</p>
        </div>
      </div>

      <div>
        <label class="block text-[13px] text-ink-soft mb-1">Adresse e-mail</label>
        <div
            class="flex items-center h-10 px-3 border rounded-[10px] focus-within:ring-1 transition-colors"
            :class="errors.email ? 'border-danger focus-within:border-danger focus-within:ring-danger' : 'border-input focus-within:border-primary focus-within:ring-primary'"
        >
          <Icon name="mail" :size="20" class="text-muted mr-2"/>
          <input
              v-model="form.email"
              @input="clearError('email')"
              type="email"
              placeholder="jean.dupont@infradev.fr"
              class="flex-1 outline-none text-[15px] bg-transparent"
          />
        </div>
        <p v-if="errors.email" class="text-[12px] text-danger mt-1">{{ errors.email }}</p>
      </div>

      <div>
        <label class="block text-[13px] text-ink-soft mb-1">Mot de passe</label>
        <div
            class="flex items-center h-10 px-3 border rounded-[10px] focus-within:ring-1 transition-colors"
            :class="errors.password ? 'border-danger focus-within:border-danger focus-within:ring-danger' : 'border-input focus-within:border-primary focus-within:ring-primary'"
        >
          <Icon name="lock" :size="20" class="text-muted mr-2"/>
          <input
              v-model="form.password"
              @input="clearError('password')"
              :type="showPassword ? 'text' : 'password'"
              placeholder="••••••••••"
              class="flex-1 outline-none text-[15px] bg-transparent"
          />
          <button type="button" class="text-muted hover:text-ink transition-colors"
                  @click="showPassword = !showPassword">
            <Icon :name="showPassword ? 'visibility_off' : 'visibility'" :size="20"/>
          </button>
        </div>
        <!-- Jauge de force : se remplit selon les critères satisfaits -->
        <div class="mt-3 flex gap-1 h-1">
          <div
              v-for="bar in 4"
              :key="bar"
              class="flex-1 rounded-full transition-colors"
              :class="bar <= strength ? strengthColor : 'bg-input'"
          ></div>
        </div>
        <p v-if="errors.password" class="text-[12px] text-danger mt-2">{{ errors.password }}</p>
        <p v-else class="text-[13px] text-muted mt-2">10 caractères minimum, une majuscule, une minuscule, un chiffre,
          un caractère spécial</p>
      </div>

      <div>
        <label class="block text-[13px] text-ink-soft mb-1">Confirmer le mot de passe</label>
        <div
            class="flex items-center h-10 px-3 border rounded-[10px] focus-within:ring-1 transition-colors"
            :class="errors.confirmPassword ? 'border-danger focus-within:border-danger focus-within:ring-danger' : 'border-input focus-within:border-primary focus-within:ring-primary'"
        >
          <Icon name="lock" :size="20" class="text-muted mr-2"/>
          <input
              v-model="form.confirmPassword"
              @input="clearError('confirmPassword')"
              type="password"
              placeholder="••••••••"
              class="flex-1 outline-none text-[15px] bg-transparent"
          />
        </div>
        <p v-if="errors.confirmPassword" class="text-[12px] text-danger mt-1">{{ errors.confirmPassword }}</p>
      </div>

      <button
          type="submit"
          :disabled="auth.loading"
          class="w-full h-10 rounded-[10px] bg-primary text-white text-sm font-semibold flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {{ auth.loading ? 'Création en cours...' : "S'inscrire" }}
      </button>

      <p class="text-center text-[13px] text-muted">
        Déjà un compte ?
        <RouterLink to="/connexion" class="text-primary font-semibold hover:underline ml-1">Se connecter</RouterLink>
      </p>
    </form>
  </div>
</template>
