import {readdirSync, readFileSync} from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {describe, expect, it} from 'vitest'
import {FALLBACK_ICON, hasIcon, iconPath} from './index'
import {BADGE_ICON_CHOICES, badgeIcon} from '@/utils/badgeIcons'
import {attachmentIcon} from '@/utils/attachment'

const SRC_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// Formes sous lesquelles un nom d'icône apparaît dans le code.
const ICON_PATTERNS = [
    // <Icon name="add"/>, y compris quand l'attribut est sur une autre ligne
    /<Icon\b[^>]*?\sname="([a-z0-9_]+)"/g,
    // { icon: 'dashboard' } dans les listes de liens, d'indicateurs ou de statuts
    /\bicon: *'([a-z0-9_]+)'/g
]

// Valeurs littérales d'un :name dynamique, par exemple :name="open ? 'close' : 'menu'"
const DYNAMIC_NAME = /<Icon\b[^>]*?\s:name="([^"]+)"/g
const QUOTED = /'([a-z0-9_]+)'/g
// Une comparaison (variant === 'danger') contient une valeur et non une icône.
const COMPARISON = /[\w.]+ *===? *'[^']*'/g

function sourceFiles(dir) {
    return readdirSync(dir, {withFileTypes: true}).flatMap((entry) => {
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
            return sourceFiles(fullPath)
        }
        const isSource = /\.(vue|js)$/.test(entry.name) && !entry.name.endsWith('.test.js')
        return isSource ? [fullPath] : []
    })
}

function iconNamesUsedInSources() {
    const names = new Set()
    for (const file of sourceFiles(SRC_DIR)) {
        const content = readFileSync(file, 'utf8')
        for (const pattern of ICON_PATTERNS) {
            for (const match of content.matchAll(pattern)) {
                names.add(match[1])
            }
        }
        for (const match of content.matchAll(DYNAMIC_NAME)) {
            for (const literal of match[1].replace(COMPARISON, '').matchAll(QUOTED)) {
                names.add(literal[1])
            }
        }
    }
    return [...names]
}

describe('registre des icônes', () => {
    it('contient toutes les icônes utilisées dans le code', () => {
        const missing = iconNamesUsedInSources().filter((name) => !hasIcon(name))
        expect(missing).toEqual([])
    })

    it('contient les icônes proposées pour les badges', () => {
        expect(BADGE_ICON_CHOICES.filter((name) => !hasIcon(name))).toEqual([])
    })

    it('contient les icônes des pièces jointes', () => {
        const types = ['', 'image/png', 'application/pdf', 'application/zip', 'text/plain']
        expect(types.map(attachmentIcon).filter((name) => !hasIcon(name))).toEqual([])
    })

    it('renvoie le tracé de repli pour un nom inconnu', () => {
        expect(iconPath('nom_inexistant')).toBe(iconPath(FALLBACK_ICON))
    })
})

describe('badgeIcon', () => {
    it('traduit un ancien code Lucide', () => {
        expect(badgeIcon('flame')).toBe('local_fire_department')
    })

    it('garde un nom Material présent dans le registre', () => {
        expect(badgeIcon('rocket')).toBe('rocket')
    })

    it('retombe sur l\'icône par défaut pour un code absent ou inconnu', () => {
        expect(badgeIcon('')).toBe('military_tech')
        expect(badgeIcon('inconnu')).toBe('military_tech')
    })
})
