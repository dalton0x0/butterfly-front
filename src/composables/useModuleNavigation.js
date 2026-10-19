import {ref} from 'vue'
import {moduleService} from '@/services/moduleService'
import {buildModuleSequence, findNeighbours} from '@/utils/moduleSequence'

/**
 * Calcule l'élément précédent et l'élément suivant d'un cours ou d'un exercice.
 *
 * Le module est rechargé à chaque appel de load et non gardé en mémoire : terminer
 * un cours peut déverrouiller l'exercice suivant, le verrou affiché doit suivre.
 *
 * Un échec de chargement n'est pas affiché. La navigation est un confort : la page
 * du cours reste utilisable sans elle, et le bouton de retour au module existe déjà.
 *
 * @param {string} type le type de l'élément courant (CONTENT_TYPES)
 * @returns {{previous: import('vue').Ref<object|null>, next: import('vue').Ref<object|null>, load: Function}}
 */
export function useModuleNavigation(type) {
    const previous = ref(null)
    const next = ref(null)

    /**
     * @param {number|null} moduleId le module de l'élément courant
     * @param {number} currentId l'identifiant de l'élément courant
     */
    async function load(moduleId, currentId) {
        if (!moduleId) {
            previous.value = null
            next.value = null
            return
        }
        try {
            const module = await moduleService.getModule(moduleId)
            const neighbours = findNeighbours(buildModuleSequence(module), type, currentId)
            previous.value = neighbours.previous
            next.value = neighbours.next
        } catch {
            previous.value = null
            next.value = null
        }
    }

    return {previous, next, load}
}
