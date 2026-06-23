/*
  Correspondance des icônes de badge.

  Le backend stocke pour chaque badge un code d'icône issu de la convention Lucide
  (ex : flame, compass, book-check, dumbbell...). Le front, lui, affiche des
  Material Symbols Outlined. Certains noms existent dans les deux jeux (star,
  refresh, rocket...) et s'affichent tels quels ; les autres ne correspondent à
  rien dans la police et apparaissent cassés.

  Cette table traduit les codes connus vers une icône Material Symbols valide.
  Tout code non listé est renvoyé tel quel (un administrateur peut donc déjà saisir
  un nom Material Symbols valide), et l'absence de code retombe sur une icône par
  défaut. On garde ainsi le backend inchangé et la logique d'affichage centralisée.
*/

const MATERIAL_BY_BADGE_ICON = {
    pencil: 'edit',
    'book-check': 'menu_book',
    compass: 'explore',
    flame: 'local_fire_department',
    brain: 'psychology',
    dumbbell: 'fitness_center',
    award: 'military_tech',
    sunrise: 'wb_twilight',
    moon: 'bedtime'
}

const DEFAULT_BADGE_ICON = 'military_tech'

/**
 * Renvoie le nom d'icône Material Symbols à afficher pour un code de badge.
 * @param {string} code code d'icône stocké côté backend
 * @returns {string} nom d'icône Material Symbols
 */
export function badgeIcon(code) {
    if (!code) {
        return DEFAULT_BADGE_ICON
    }
    return MATERIAL_BY_BADGE_ICON[code] || code
}
