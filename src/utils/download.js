/*
  Téléchargement d'un contenu déjà présent en mémoire.

  Les fichiers de l'application ne sont jamais accessibles par un lien direct : ils
  arrivent par l'API avec le jeton d'authentification sous forme de Blob. Un simple
  href vers l'URL du serveur renverrait un 401.

  Cette fonction vivait dans utils/attachment.js où seules les pièces jointes
  l'utilisaient. Elle sert désormais aussi aux rendus des apprenants et au modèle
  d'import de questions qui n'ont rien à voir avec les pièces jointes : elle est
  remontée ici pour que son nom de module décrive ce qu'elle fait.
*/

// Délai avant libération de l'URL temporaire. Le navigateur lit le Blob de façon
// asynchrone après le clic : libérer immédiatement interrompt le téléchargement sur
// certains navigateurs, Firefox notamment. Une seconde laisse le temps au transfert
// de démarrer, la mémoire est rendue juste après.
const REVOKE_DELAY_MS = 1000

/**
 * Déclenche le téléchargement d'un blob sous un nom donné.
 *
 * @param {Blob} blob le contenu à enregistrer
 * @param {string} filename le nom proposé à l'utilisateur
 */
export function saveBlobAs(blob, filename) {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename || 'fichier'

    // Le lien est attaché au document avant le clic. Un clic programmatique sur un
    // élément détaché n'est pas déclenché de façon fiable partout.
    document.body.appendChild(link)
    link.click()
    link.remove()

    setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS)
}
