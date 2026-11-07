/*
  Correspondance des icônes de badge.

  Le backend stocke pour chaque badge un code d'icône. Les badges créés par le
  BadgeSeeder utilisent des codes Lucide (flame, compass, book-check...). Les badges
  modifiés depuis l'interface stockent directement un nom Material Symbols choisi
  dans BADGE_ICON_CHOICES.

  Les icônes sont embarquées une par une (voir src/icons). Un code qui n'est ni
  traduit ni présent dans le registre retombe donc sur l'icône par défaut.
*/

import {hasIcon} from '@/icons'

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

// Icônes proposées dans l'écran d'édition d'un badge.
export const BADGE_ICON_CHOICES = [
    'military_tech', 'workspace_premium', 'trophy', 'star', 'crown', 'diamond',
    'rocket', 'bolt', 'local_fire_department', 'speed', 'timer', 'target',
    'flag', 'verified', 'explore', 'psychology', 'lightbulb', 'fitness_center',
    'menu_book', 'edit', 'school', 'code', 'terminal', 'refresh',
    'celebration', 'favorite', 'thumb_up', 'wb_twilight', 'bedtime'
]

/**
 * Renvoie le nom d'icône Material Symbols à afficher pour un code de badge.
 * @param {string} code code d'icône stocké côté backend
 * @returns {string} nom d'icône Material Symbols
 */
export function badgeIcon(code) {
    const name = MATERIAL_BY_BADGE_ICON[code] || code
    return hasIcon(name) ? name : DEFAULT_BADGE_ICON
}
