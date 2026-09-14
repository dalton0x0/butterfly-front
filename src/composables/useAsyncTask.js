import {ref} from 'vue'

/**
 * Gère l'état de chargement et le message d'erreur d'une opération asynchrone.
 *
 * Le même cadre était recopié dans 36 fonctions de chargement :
 *
 *     loading.value = true
 *     error.value = ''
 *     try {
 *       // ...
 *     } catch (err) {
 *       error.value = err.message || 'Message de repli.'
 *     } finally {
 *       loading.value = false
 *     }
 *
 * Six lignes identiques autour d'un corps variable et d'un message de repli.
 *
 * Le composable apporte en plus une protection contre les réponses périmées. Un
 * écran filtré ou muni d'une recherche peut lancer plusieurs appels qui se
 * chevauchent et rien ne garantit qu'ils reviennent dans l'ordre. Seule la
 * dernière exécution lancée a le droit d'écrire dans l'état : une réponse plus
 * ancienne qui arrive après est ignorée, erreur comprise.
 *
 * @param {string} fallbackMessage message affiché quand l'erreur n'en porte pas
 * @param {{loadingFromStart: boolean}} [options] loadingFromStart place l'état en
 * chargement dès la création, avant même le premier appel. À utiliser quand la
 * tâche part sur onMounted : sans cela le premier rendu montrerait l'état vide
 * pendant un instant au lieu du squelette.
 * @returns {{loading: import('vue').Ref<boolean>, error: import('vue').Ref<string>, run: Function}}
 */
export function useAsyncTask(fallbackMessage = 'Une erreur est survenue.', options = {}) {
    const loading = ref(options.loadingFromStart === true)
    const error = ref('')

    // Numéro de la dernière exécution lancée. Sert à reconnaître les réponses périmées.
    let lastRunId = 0

    /**
     * Exécute la tâche en tenant l'état à jour.
     *
     * @param {Function} task fonction asynchrone à exécuter
     * @returns {Promise<*>} le résultat de la tâche
     * ou undefined en cas d'erreur ou d'exécution périmée
     */
    async function run(task) {
        const runId = ++lastRunId
        loading.value = true
        error.value = ''
        try {
            const result = await task()
            return runId === lastRunId ? result : undefined
        } catch (err) {
            if (runId === lastRunId) {
                error.value = err.message || fallbackMessage
            }
            return undefined
        } finally {
            if (runId === lastRunId) {
                loading.value = false
            }
        }
    }

    return {loading, error, run}
}
