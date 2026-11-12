<script setup>
// Espace admin : apprenants et formateurs d'un bloc, gérés depuis le bloc.
// Évite d'ouvrir chaque compte un à un pour lui assigner le bloc.
//
// Deux listes côte à côte : les membres (retrait) et les comptes ajoutables (ajout).
// Une promotion choisie dans le filtre peut aussi être ajoutée en entier.
// Réservé à l'administrateur et au gestionnaire, comme l'assignation depuis un compte.
import {computed, onMounted, ref} from 'vue'
import {useRoute} from 'vue-router'
import {useAsyncTask} from '@/composables/useAsyncTask'
import {blockService} from '@/services/blockService'
import {promotionService} from '@/services/promotionService'
import BlockMemberList from '@/components/BlockMemberList.vue'
import Breadcrumb from '@/components/Breadcrumb.vue'
import Icon from '@/components/Icon.vue'
import Modal from '@/components/Modal.vue'

const route = useRoute()
const blockId = Number(route.params.id)

const {loading, error, run} = useAsyncTask('Impossible de charger le bloc.', {loadingFromStart: true})
const block = ref(null)
const promotions = ref([])

const membersList = ref(null)
const candidatesList = ref(null)

const busy = ref(false)
const success = ref('')
const actionError = ref('')

// Promotion choisie dans le filtre des comptes ajoutables.
const candidatePromotionId = ref(null)
const candidatePromotion = computed(() =>
  promotions.value.find((p) => p.id === candidatePromotionId.value) || null
)
const showPromotionConfirm = ref(false)

function onCandidateFilters(filters) {
  candidatePromotionId.value = filters.promotionId ?? null
}

function plural(count, word) {
  return `${count} ${word}${count > 1 ? 's' : ''}`
}

/**
 * Message de bilan : « 3 comptes ajoutés, 1 déjà présent ».
 */
function summary({updated, unchanged}, done, already) {
  const parts = [`${plural(updated, 'compte')} ${done}${updated > 1 ? 's' : ''}`]
  if (unchanged > 0) {
    parts.push(`${unchanged} ${already}${unchanged > 1 ? 's' : ''}`)
  }
  return parts.join(', ') + '.'
}

async function act(action, describe) {
  busy.value = true
  success.value = ''
  actionError.value = ''
  try {
    const result = await action()
    success.value = describe(result)
    // Un compte change de liste : les deux se rechargent.
    await Promise.all([membersList.value?.reset(), candidatesList.value?.reset()])
  } catch (err) {
    actionError.value = err.message || "L'opération a échoué."
  } finally {
    busy.value = false
  }
}

function addMembers(userIds) {
  return act(() => blockService.addMembers(blockId, userIds),
    (result) => summary(result, 'ajouté', 'déjà présent'))
}

function removeMembers(userIds) {
  return act(() => blockService.removeMembers(blockId, userIds),
    (result) => summary(result, 'retiré', 'déjà absent'))
}

async function confirmAddPromotion() {
  const promotion = candidatePromotion.value
  showPromotionConfirm.value = false
  if (!promotion) {
    return
  }
  await act(() => blockService.addPromotion(blockId, promotion.id),
    (result) => `Promotion « ${promotion.name} » : ` + summary(result, 'ajouté', 'déjà présent'))
}

const fetchMembers = (page, filters) => blockService.getMembers(blockId, filters, {page})
const fetchCandidates = (page, filters) => blockService.getMemberCandidates(blockId, filters, {page})

onMounted(() => run(async () => {
  // Les promotions ne servent qu'au filtre : leur échec n'empêche pas l'écran de servir.
  const [loaded, promotionPage] = await Promise.all([
    blockService.getBlock(blockId),
    promotionService.getPromotions({size: 100, sort: 'name'}).catch(() => ({items: []}))
  ])
  block.value = loaded
  promotions.value = promotionPage.items
}))
</script>

<template>
  <div v-if="loading" class="text-[15px] text-muted py-10 text-center">Chargement du bloc...</div>
  <div v-else-if="error" class="text-[15px] text-danger bg-danger/8 rounded-[10px] px-4 py-3">{{ error }}</div>

  <template v-else-if="block">
    <Breadcrumb :items="[
      { label: 'Contenus', to: '/formateur/contenus' },
      { label: block.name, to: `/formateur/contenus/blocs/${block.id}` },
      { label: 'Membres' }
    ]"/>

    <div class="mb-6">
      <h1 class="text-[30px] font-semibold text-navy">Membres du bloc {{ block.name }}</h1>
      <p class="text-ink-soft mt-1">Cochez des comptes pour les ajouter ou les retirer en une fois.</p>
    </div>

    <!-- Un bloc informatif est visible par tous : il n'a jamais de membre. -->
    <p v-if="block.informational"
       class="text-[14px] text-ink-soft bg-surface-tint rounded-[10px] px-4 py-3">
      Ce bloc est informatif : il est déjà visible par tous les comptes connectés et ne s'assigne à personne.
    </p>

    <template v-else>
      <p v-if="success" class="text-[14px] text-success bg-success/10 rounded-[10px] px-4 py-2.5 mb-5" role="status">
        {{ success }}
      </p>
      <p v-if="actionError" class="text-[14px] text-danger bg-danger/8 rounded-[10px] px-4 py-2.5 mb-5" role="alert">
        {{ actionError }}
      </p>

      <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <BlockMemberList
          ref="membersList"
          list-id="block-members"
          title="Membres actuels"
          empty-text="Aucun compte n'est encore assigné à ce bloc."
          :fetcher="fetchMembers"
          action-label="Retirer"
          action-icon="person_remove"
          action-variant="danger"
          :busy="busy"
          @action="removeMembers"
        />

        <BlockMemberList
          ref="candidatesList"
          list-id="block-candidates"
          title="Comptes à ajouter"
          empty-text="Tous les apprenants et formateurs sont déjà dans ce bloc."
          :fetcher="fetchCandidates"
          :promotions="promotions"
          action-label="Ajouter"
          action-icon="person_add"
          :busy="busy"
          @action="addMembers"
          @filters="onCandidateFilters"
        >
          <template #extra-actions>
            <button v-if="candidatePromotion" type="button"
                    class="h-9 px-3 rounded-[10px] border border-input text-primary text-sm font-semibold flex items-center gap-1.5 hover:bg-surface-tint transition-colors disabled:opacity-50"
                    :disabled="busy"
                    @click="showPromotionConfirm = true">
              <Icon name="group" :size="16"/>
              Toute la promotion
            </button>
          </template>
        </BlockMemberList>
      </div>
    </template>

    <Modal v-if="showPromotionConfirm && candidatePromotion" @close="showPromotionConfirm = false">
      <div class="p-6">
        <h2 class="text-[18px] font-semibold text-ink mb-2">Ajouter toute la promotion ?</h2>
        <p class="text-[14px] text-ink-soft mb-5">
          Tous les apprenants de « {{ candidatePromotion.name }} » recevront le bloc {{ block.name }}.
          Ceux qui l'ont déjà ne sont pas concernés. Chacun est prévenu par e-mail selon ses préférences.
        </p>
        <div class="flex justify-end gap-2">
          <button type="button" class="h-10 px-4 rounded-[10px] text-sm font-semibold text-ink-soft hover:bg-surface-tint"
                  @click="showPromotionConfirm = false">
            Annuler
          </button>
          <button type="button" class="h-10 px-4 rounded-[10px] bg-primary text-white text-sm font-semibold hover:opacity-90"
                  @click="confirmAddPromotion">
            Ajouter la promotion
          </button>
        </div>
      </div>
    </Modal>
  </template>
</template>
