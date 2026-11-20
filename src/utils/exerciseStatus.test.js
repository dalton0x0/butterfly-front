import {describe, expect, it} from 'vitest'
import {exerciseStatusChip} from './exerciseStatus'

describe('exerciseStatusChip', () => {
    it('signale un exercice rendu en attente de correction', () => {
        expect(exerciseStatusChip('SUBMITTED').label).toBe('En attente de correction')
    })

    it('signale un exercice à retravailler', () => {
        expect(exerciseStatusChip('REJECTED').label).toBe('À retravailler')
    })

    it("traite un exercice jamais rendu comme à faire", () => {
        expect(exerciseStatusChip(undefined).label).toBe('À faire')
    })
})
