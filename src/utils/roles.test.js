import {describe, expect, it} from 'vitest'
import {canManageAccount, grantableRoles, hasGlobalScope, manageableRoles, roleChip, ROLES} from './roles'

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

describe('grantableRoles', () => {
    it("réserve la nomination d'administrateurs au propriétaire", () => {
        expect(grantableRoles(ROLES.ADMIN, true)).toContain(ROLES.ADMIN)
        expect(grantableRoles(ROLES.ADMIN, false)).toEqual([ROLES.USER, ROLES.TEACHER, ROLES.MANAGER])
    })

    it('limite toujours le gestionnaire aux apprenants et aux formateurs', () => {
        expect(grantableRoles(ROLES.MANAGER, false)).toEqual([ROLES.USER, ROLES.TEACHER])
    })
})

describe('canManageAccount', () => {
    const owner = {id: 1, owner: true}
    const admin = {id: 2, owner: false}

    it('protège le compte propriétaire contre les autres administrateurs', () => {
        expect(canManageAccount(admin, {id: 1, role: ROLES.ADMIN, owner: true})).toBe(false)
    })

    it('laisse au propriétaire la gestion des autres administrateurs', () => {
        expect(canManageAccount(owner, {id: 3, role: ROLES.ADMIN})).toBe(true)
        expect(canManageAccount(admin, {id: 3, role: ROLES.ADMIN})).toBe(false)
    })

    it('laisse tout administrateur gérer les autres comptes', () => {
        expect(canManageAccount(admin, {id: 4, role: ROLES.TEACHER})).toBe(true)
    })

    it('ne bloque pas une action sur son propre compte', () => {
        expect(canManageAccount(admin, {id: 2, role: ROLES.ADMIN})).toBe(true)
    })
})
