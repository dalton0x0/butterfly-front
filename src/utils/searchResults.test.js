import {describe, expect, it} from 'vitest'
import {searchHitRoute, toSearchGroups} from './searchResults'
import {ROLES} from './roles'

describe('searchHitRoute', () => {
    it('ouvre la page de lecture pour un apprenant', () => {
        expect(searchHitRoute({type: 'COURSE', id: 4}, ROLES.USER)).toBe('/cours/4')
        expect(searchHitRoute({type: 'QUIZ', id: 2}, ROLES.USER)).toBe('/quiz/2')
    })

    it('ouvre l\'espace d\'édition pour le personnel', () => {
        expect(searchHitRoute({type: 'COURSE', id: 4}, ROLES.TEACHER)).toBe('/formateur/contenus/cours/4')
        expect(searchHitRoute({type: 'BLOCK', id: 1}, ROLES.ADMIN)).toBe('/formateur/contenus/blocs/1')
    })

    it('mène à la fiche utilisateur adaptée au rôle', () => {
        expect(searchHitRoute({type: 'USER', id: 9}, ROLES.ADMIN)).toBe('/admin/utilisateurs/9')
        expect(searchHitRoute({type: 'USER', id: 9}, ROLES.TEACHER)).toBe('/formateur/apprenants/9')
        expect(searchHitRoute({type: 'USER', id: 9}, ROLES.USER)).toBeNull()
    })

    it('renvoie null pour une nature inconnue', () => {
        expect(searchHitRoute({type: 'AUTRE', id: 1}, ROLES.ADMIN)).toBeNull()
    })
})

describe('toSearchGroups', () => {
    const response = {
        blocks: [],
        modules: [{type: 'MODULE', id: 3, title: 'Héritage'}],
        courses: [],
        exercises: [],
        quizzes: [],
        users: [{type: 'USER', id: 9, title: 'Léa Martin'}]
    }

    it('écarte les groupes vides et ajoute l\'adresse de chaque résultat', () => {
        const groups = toSearchGroups(response, ROLES.ADMIN)

        expect(groups.map((g) => g.key)).toEqual(['modules', 'users'])
        expect(groups[0].hits[0].to).toBe('/formateur/contenus/modules/3')
    })

    it('nomme le groupe des utilisateurs « Apprenants » pour un formateur', () => {
        const users = toSearchGroups(response, ROLES.TEACHER).find((g) => g.key === 'users')

        expect(users.label).toBe('Apprenants')
    })

    it('renvoie une liste vide sans réponse', () => {
        expect(toSearchGroups(null, ROLES.USER)).toEqual([])
    })
})
