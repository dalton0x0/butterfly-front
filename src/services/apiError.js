/*
  Erreur applicative unifiée.

  Toutes les erreurs remontées par le client HTTP sont des instances de cette classe.
  Rejeter une vraie Error plutôt qu'un objet littéral apporte trois choses :

  1. Une pile d'appels exploitable. Un objet littéral n'en a pas, ce qui rend le
     débogage aveugle dès que l'erreur traverse plusieurs couches.
  2. Le fonctionnement attendu de instanceof, donc la possibilité de distinguer une
     erreur d'API d'une erreur de programmation (TypeError, ReferenceError) dans un
     même bloc catch.
  3. Un affichage correct dans la console et les outils de supervision, qui traitent
     spécifiquement les objets Error.

  Les propriétés exposées (status, message, validationErrors) reprennent exactement
  celles de l'objet précédemment rejeté : le code appelant n'a rien à changer.
*/

export class ApiError extends Error {

    /**
     * @param {object} details
     * @param {number} details.status code HTTP, 0 si la requête n'a pas abouti
     * @param {string} details.message message destiné à l'utilisateur
     * @param {object|null} details.validationErrors erreurs de validation par champ
     * @param {Error} [details.cause] erreur d'origine, conservée pour le débogage
     */
    constructor({status, message, validationErrors = null, cause}) {
        super(message, {cause})
        this.name = 'ApiError'
        this.status = status
        this.validationErrors = validationErrors
    }

    /**
     * Indique une erreur de validation côté serveur, avec le détail par champ.
     */
    get isValidationError() {
        return this.status === 400 && this.validationErrors !== null
    }

    /**
     * Indique un accès refusé : la session est valide, mais la ressource visée sort du
     * périmètre de l'utilisateur (portée pédagogique d'un formateur, action réservée à
     * l'administrateur).
     *
     * À distinguer d'une panne : réessayer ne changera rien, l'interface doit donc
     * proposer autre chose plutôt qu'un simple message d'erreur.
     */
    get isForbidden() {
        return this.status === 403
    }
}
