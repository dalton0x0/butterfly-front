import {describe, expect, it} from 'vitest'
import {buildModuleSequence, contentKindLabel, contentRoute, CONTENT_TYPES, findNeighbours} from './moduleSequence'

const module = {
    courses: [
        {id: 1, name: 'Cours B', position: 2},
        {id: 2, name: 'Cours A', position: 0}
    ],
    exercises: [
        {id: 7, name: 'Exercice', position: 1, locked: true}
    ],
    quiz: {id: 3, name: 'Quiz final'}
}

describe('buildModuleSequence', () => {
    it('trie cours et exercices par position et place le quiz à la fin', () => {
        const sequence = buildModuleSequence(module)

        expect(sequence.map((i) => `${i._type}:${i.id}`)).toEqual([
            'course:2', 'exercise:7', 'course:1', 'quiz:3'
        ])
    })

    it('conserve les champs d\'origine, verrouillage compris', () => {
        const exercise = buildModuleSequence(module).find((i) => i._type === CONTENT_TYPES.EXERCISE)

        expect(exercise.locked).toBe(true)
    })

    it('renvoie une séquence vide sans module', () => {
        expect(buildModuleSequence(null)).toEqual([])
    })

    it('accepte un module sans quiz ni listes', () => {
        expect(buildModuleSequence({})).toEqual([])
    })
})

describe('findNeighbours', () => {
    const sequence = buildModuleSequence(module)

    it('donne le précédent et le suivant d\'un élément au milieu', () => {
        const {previous, next} = findNeighbours(sequence, CONTENT_TYPES.EXERCISE, 7)

        expect(previous.id).toBe(2)
        expect(next.id).toBe(1)
    })

    it('renvoie null avant le premier élément', () => {
        expect(findNeighbours(sequence, CONTENT_TYPES.COURSE, 2).previous).toBeNull()
    })

    it('mène au quiz depuis le dernier cours', () => {
        expect(findNeighbours(sequence, CONTENT_TYPES.COURSE, 1).next._type).toBe(CONTENT_TYPES.QUIZ)
    })

    it('distingue un cours et un exercice de même identifiant', () => {
        const sameIds = buildModuleSequence({
            courses: [{id: 5, position: 0}],
            exercises: [{id: 5, position: 1}]
        })

        expect(findNeighbours(sameIds, CONTENT_TYPES.EXERCISE, 5).previous._type).toBe(CONTENT_TYPES.COURSE)
    })

    it('renvoie deux null pour un élément absent', () => {
        expect(findNeighbours(sequence, CONTENT_TYPES.COURSE, 99)).toEqual({previous: null, next: null})
    })
})

describe('contentRoute et contentKindLabel', () => {
    it('construisent l\'adresse et le libellé selon le type', () => {
        const quiz = {id: 3, _type: CONTENT_TYPES.QUIZ}

        expect(contentRoute(quiz)).toBe('/quiz/3')
        expect(contentKindLabel(quiz)).toBe('Quiz')
    })
})
