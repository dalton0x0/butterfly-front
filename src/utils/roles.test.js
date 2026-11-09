import {describe, expect, it} from 'vitest'
import {hasGlobalScope, manageableRoles, roleChip, ROLES} from './roles'

describe('manageableRoles', () => {
    it('donne tous les rôles à l\'administrateur', () => {
        expect(manageableRoles(ROLES.ADMIN)).toEqual([ROLES.USER, ROLES.TEACHER, ROLES.MANAGER, ROLES.ADMIN])
    })

    it('limite le gestionnaire aux apprenants et aux formateurs', () => {
        expect(manageableRoles(ROLES.MANAGER)).toEqual([ROLES.USER, ROLES.TEACHER])
    })
})

describe('hasGlobalScope', () => {
    it('vaut vrai pour l\'administrateur et le gestionnaire seulement', () => {
        expect(hasGlobalScope(ROLES.ADMIN)).toBe(true)
        expect(hasGlobalScope(ROLES.MANAGER)).toBe(true)
        expect(hasGlobalScope(ROLES.TEACHER)).toBe(false)
    })
})

describe('roleChip', () => {
    it('affiche « Gestionnaire » pour le rôle MANAGER', () => {
        expect(roleChip(ROLES.MANAGER).label).toBe('Gestionnaire')
    })
})
