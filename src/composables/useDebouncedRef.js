import {ref, watch} from 'vue'

/*
  Copie retardée d'une valeur réactive.

  Utile pour un champ de recherche relié au serveur : sans délai, taper "Dupont" lance
  six requêtes dont cinq sont déjà obsolètes à leur arrivée. La copie n'est mise à jour
  qu'une fois la saisie stabilisée et c'est elle qui déclenche le rechargement.

  Le délai n'est pas une optimisation cosmétique : il divise par six le nombre d'appels
  sur une recherche courante et évite au serveur de traiter des requêtes dont personne
  n'attend plus le résultat.
*/

/**
 * Crée une référence qui recopie la source après une période de calme.
 *
 * @param {import('vue').Ref} source la référence observée
 * @param {number} [delay] délai de stabilisation en millisecondes
 * @returns {import('vue').Ref} la copie retardée, en lecture seule en pratique
 */
export function useDebouncedRef(source, delay = 300) {
    const debounced = ref(source.value)
    let timer = null

    watch(source, (value) => {
        clearTimeout(timer)
        timer = setTimeout(() => {
            debounced.value = value
        }, delay)
    })

    return debounced
}
