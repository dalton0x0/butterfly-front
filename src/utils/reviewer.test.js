import {describe, expect, it} from 'vitest'
import {reviewerChip, reviewerMention} from './reviewer'

describe('reviewerMention', () => {
    it("donne le nom du correcteur à l'équipe", () => {
        expect(reviewerMention({reviewerName: 'Sophie LAURENT', reviewedByAdministration: false}))
            .toBe('Corrigé par Sophie LAURENT')
    })

    it("signale l'administration à l'apprenant, sans nom", () => {
        expect(reviewerMention({reviewedByAdministration: true})).toBe("Corrigé par l'administration")
    })

    it('ne dit rien pour une correction de formateur vue par l\'apprenant', () => {
        expect(reviewerMention({reviewedByAdministration: false})).toBeNull()
    })

    it('ne dit rien sans soumission', () => {
        expect(reviewerMention(null)).toBeNull()
    })
})

describe('reviewerChip', () => {
    it("marque une correction de l'administration avec son icône", () => {
        expect(reviewerChip({reviewedByAdministration: true}))
            .toEqual({label: "Corrigé par l'administration", variant: 'primary', icon: 'shield_person'})
    })

    it("ne crée pas de pastille quand il n'y a rien à dire", () => {
        expect(reviewerChip({reviewedByAdministration: false})).toBeNull()
    })
})
