import {describe, expect, it} from 'vitest'
import {canManageAccount, creatableRoles, hasGlobalScope, roleChip, ROLES} from './roles'

describe('canManageAccount', () => {
    it('laisse l\'administrateur gérer tous les comptes', () => {
        for (const target of Object.values(ROLES)) {
            expect(canManageAccount(ROLES.ADMIN, target)).toBe(true)
        }
    })

    it('limite le gestionnaire aux apprenants et aux formateurs', () => {
        expect(canManageAccount(ROLES.MANAGER, ROLES.USER)).toBe(true)
        expect(canManageAccount(ROLES.MANAGER, ROLES.TEACHER)).toBe(true)
        expect(canManageAccount(ROLES.MANAGER, ROLES.MANAGER)).toBe(false)
        expect(canManageAccount(ROLES.MANAGER, ROLES.ADMIN)).toBe(false)
    })

    it('refuse tout aux autres rôles', () => {
        expect(canManageAccount(ROLES.TEACHER, ROLES.USER)).toBe(false)
        expect(canManageAccount(ROLES.USER, ROLES.USER)).toBe(false)
    })
})

describe('creatableRoles', () => {
    it('propose tous les rôles à l\'administrateur', () => {
        expect(creatableRoles(ROLES.ADMIN)).toEqual([ROLES.USER, ROLES.TEACHER, ROLES.MANAGER, ROLES.ADMIN])
    })

    it('ne propose qu\'apprenant et formateur au gestionnaire', () => {
        expect(creatableRoles(ROLES.MANAGER)).toEqual([ROLES.USER, ROLES.TEACHER])
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
