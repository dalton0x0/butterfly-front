import {describe, expect, it} from 'vitest'
import {xpSourceLabel} from './xp'

describe('xpSourceLabel', () => {
    it('traduit une source connue', () => {
        expect(xpSourceLabel('EXERCISE_VALIDATED')).toBe('Exercice validé')
    })

    it('rend la valeur brute pour une source inconnue', () => {
        expect(xpSourceLabel('NOUVELLE_SOURCE')).toBe('NOUVELLE_SOURCE')
    })
})
