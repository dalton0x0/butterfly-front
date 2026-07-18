<script setup>
// Connexion.
import {reactive, ref} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {useAuthStore} from '@/stores/auth'
import {mapBackendError, validateEmail, validateRequired} from '@/utils/validators'
import Icon from '@/components/Icon.vue'
import LogoIcon from '@/components/LogoIcon.vue'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const showPassword = ref(false)
const rememberMe = ref(false)
const showForgotInfo = ref(false)

const form = reactive({email: '', password: ''})
const errors = reactive({email: '', password: '', global: ''})

// Efface l'erreur d'un champ dès que l'utilisateur le modifie.
function clearError(field) {
  errors[field] = ''
  errors.global = ''
}

// Validation locale avant l'envoi.
function validate() {
  errors.email = validateEmail(form.email)
  errors.password = validateRequired(form.password, 'Le mot de passe est obligatoire.')
  return !errors.email && !errors.password
}

async function handleLogin() {
  errors.global = ''
  if (!validate()) {
    return
  }
  try {
    await auth.login({email: form.email, password: form.password}, rememberMe.value)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
    router.push(redirect)
  } catch (err) {
    const {fieldErrors, globalError} = mapBackendError(err, {knownFields: ['email', 'password']})
    Object.assign(errors, fieldErrors)
    errors.global = globalError
  }
}
</script>

<template>
  <div class="bg-surface w-full max-w-[440px] rounded-2xl p-10 shadow-[var(--shadow-card)] flex flex-col items-center">
    <div class="w-15 h-15 rounded-full bg-surface-tint flex items-center justify-center mb-4 text-primary">
      <LogoIcon/>
    </div>
    <h2 class="text-[22px] font-semibold text-navy mb-1">Connexion</h2>
    <p class="text-[13px] text-muted mb-6">Heureux de vous revoir</p>

    <form class="w-full flex flex-col gap-5" @submit.prevent="handleLogin" novalidate>
      <!-- Erreur globale (identifiants invalides, compte désactivé, etc.) -->
      <p v-if="errors.global" class="text-[13px] text-danger bg-danger/8 rounded-[10px] px-3 py-2">{{
          errors.global
        }}</p>

      <div class="flex flex-col gap-1.5">
        <label class="text-[13px] text-ink-soft font-medium">Adresse e-mail</label>
        <div
          class="flex items-center h-10 px-3 border rounded-[10px] focus-within:ring-1 transition-colors"
          :class="errors.email ? 'border-danger focus-within:border-danger focus-within:ring-danger' : 'border-input focus-within:border-primary focus-within:ring-primary'"
        >
          <Icon name="mail" :size="20" class="text-muted mr-2"/>
          <input
            v-model="form.email"
            @input="clearError('email')"
            type="email"
            placeholder="exemple@butterfly.fr"
            class="flex-1 outline-none text-[15px] bg-transparent"
          />
        </div>
        <p v-if="errors.email" class="text-[12px] text-danger">{{ errors.email }}</p>
      </div>

      <div class="flex flex-col gap-1.5">
        <label class="text-[13px] text-ink-soft font-medium">Mot de passe</label>
        <div
          class="flex items-center h-10 px-3 border rounded-[10px] focus-within:ring-1 transition-colors"
          :class="errors.password ? 'border-danger focus-within:border-danger focus-within:ring-danger' : 'border-input focus-within:border-primary focus-within:ring-primary'"
        >
          <Icon name="lock" :size="20" class="text-muted mr-2"/>
          <input
            v-model="form.password"
            @input="clearError('password')"
            :type="showPassword ? 'text' : 'password'"
            placeholder="••••••••"
            class="flex-1 outline-none text-[15px] bg-transparent"
          />
          <button type="button" class="text-muted hover:text-ink transition-colors"
                  @click="showPassword = !showPassword">
            <Icon :name="showPassword ? 'visibility_off' : 'visibility'" :size="20"/>
          </button>
        </div>
        <p v-if="errors.password" class="text-[12px] text-danger">{{ errors.password }}</p>
      </div>

      <div class="flex items-center justify-between">
        <label class="flex items-center gap-2 cursor-pointer text-[13px] text-ink-soft">
          <input v-model="rememberMe" type="checkbox" class="w-4 h-4 rounded accent-[#0047ab]"/> Se souvenir de moi
        </label>
        <button type="button" class="text-[13px] text-primary font-semibold hover:underline"
                @click="showForgotInfo = true">
          Mot de passe oublié ?
        </button>
      </div>

      <!-- Pas de réinitialisation en self-service côté back. -->
      <p v-if="showForgotInfo" class="text-[12px] text-muted bg-surface-tint rounded-[10px] px-3 py-2">
        Pour réinitialiser votre mot de passe, contactez un administrateur de la plateforme.
      </p>

      <button
        type="submit"
        :disabled="auth.loading"
        class="w-full h-10 rounded-[10px] bg-primary text-white text-sm font-semibold flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {{ auth.loading ? 'Connexion en cours...' : 'Se connecter' }}
      </button>
    </form>

    <p class="text-[13px] text-muted mt-6">
      Pas encore de compte ?
      <RouterLink to="/inscription" class="text-primary font-semibold hover:underline ml-1">Créer un compte</RouterLink>
    </p>
  </div>
</template>
