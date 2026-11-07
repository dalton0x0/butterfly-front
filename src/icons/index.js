/*
  Accès aux icônes du registre.

  Chaque fichier SVG Material Symbols contient un seul tracé. On n'en garde que
  l'attribut d : le composant Icon fournit lui-même la balise svg.
*/

import {ICONS} from './registry'

// Icône affichée pour un nom absent du registre, plutôt qu'un vide.
export const FALLBACK_ICON = 'help'

const PATH_ATTRIBUTE = / d="([^"]+)"/

const PATHS = Object.fromEntries(
    Object.entries(ICONS).map(([name, svg]) => [name, svg.match(PATH_ATTRIBUTE)[1]])
)

/**
 * Indique si une icône fait partie du registre.
 * @param {string} name nom Material Symbols
 * @returns {boolean}
 */
export function hasIcon(name) {
    return Object.hasOwn(PATHS, name)
}

/**
 * Renvoie le tracé SVG d'une icône, ou celui de l'icône de repli.
 * @param {string} name nom Material Symbols
 * @returns {string} valeur de l'attribut d
 */
export function iconPath(name) {
    if (hasIcon(name)) {
        return PATHS[name]
    }
    if (import.meta.env.DEV) {
        console.warn(`Icône absente du registre : ${name}. Ajoutez-la dans src/icons/registry.js.`)
    }
    return PATHS[FALLBACK_ICON]
}
