import {computed, ref, watch} from 'vue'

/*
  Gestion d'une liste paginée : état de chargement, page courante, erreurs et
  rechargement automatique.

  Chaque vue de liste réécrivait les mêmes quatre refs et la même fonction load. Le
  composable les regroupe, mais surtout il règle deux pièges que le code dispersé
  laissait passer.

  Premier piège : changer un filtre sans revenir en page 0. L'utilisateur est en page 4,
  il tape une recherche qui ne renvoie qu'un résultat et voit une liste vide parce que
  la page 4 d'un seul résultat n'existe pas. Le watch remet donc la page à zéro dès qu'un
  filtre change et seulement dans ce cas.

  Second piège : les réponses hors délai. Deux frappes rapides déclenchent deux requêtes,
  et rien ne garantit qu'elles reviennent dans l'ordre. La plus lente écraserait alors le
  résultat de la plus récente. Chaque appel porte un numéro et seul le dernier a le
  droit d'écrire dans l'état.
*/

/**
 * Pilote une liste paginée côté serveur.
 *
 * @param {Function} fetcher fonction recevant {page} et les filtres, renvoyant une page
 *        normalisée par normalizePage
 * @param {Object} [options]
 * @param {Function} [options.filters] fonction renvoyant l'objet des filtres courants
 * @param {string} [options.errorMessage] message affiché si le chargement échoue
 * @returns {Object} l'état de la liste et ses commandes
 */
export function usePagedList(fetcher, {filters = () => ({}), errorMessage = 'Impossible de charger la liste.'} = {}) {
    const items = ref([])
    const page = ref(0)
    const totalPages = ref(0)
    const totalElements = ref(0)
    const loading = ref(true)
    const error = ref('')

    // Numéro du dernier appel lancé, pour ignorer les réponses dépassées.
    let currentRequest = 0

    const isEmpty = computed(() => !loading.value && items.value.length === 0)

    async function load() {
        const requestId = ++currentRequest
        loading.value = true
        error.value = ''

        try {
            const result = await fetcher({page: page.value, ...filters()})

            if (requestId !== currentRequest) {
                return
            }

            items.value = result.items
            totalPages.value = result.totalPages
            totalElements.value = result.totalElements
        } catch (err) {
            if (requestId !== currentRequest) {
                return
            }
            error.value = err.message || errorMessage
            items.value = []
            totalPages.value = 0
            totalElements.value = 0
        } finally {
            if (requestId === currentRequest) {
                loading.value = false
            }
        }
    }

    /**
     * Change de page. La valeur est bornée pour qu'un clic rapide sur le dernier bouton
     * ne demande pas une page inexistante.
     */
    function goToPage(target) {
        const bounded = Math.min(Math.max(target, 0), Math.max(totalPages.value - 1, 0))
        if (bounded === page.value) {
            return
        }
        page.value = bounded
        load()
    }

    /**
     * Recharge la page courante sans la réinitialiser.
     * À utiliser après une action qui modifie une ligne affichée.
     */
    function refresh() {
        return load()
    }

    // Un changement de filtre repart de la première page, un changement de page non.
    watch(filters, () => {
        page.value = 0
        load()
    }, {deep: true})

    return {items, page, totalPages, totalElements, loading, error, isEmpty, load, goToPage, refresh}
}
