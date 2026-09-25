import {describe, it, expect} from 'vitest'
import {buildRecentActivity} from '@/utils/activity.js'

/*
  La fabrique fusionne trois flux de natures différentes en une seule chronologie.
  Les points sensibles sont le tri entre flux, l'écart des entrées sans date, et le
  cas de la tentative de quiz abandonnée, dont le score ne veut rien dire.
*/

describe('buildRecentActivity', () => {
    it('renvoie une liste vide quand l\'aperçu est absent', () => {
        expect(buildRecentActivity(null, 10)).toEqual([])
        expect(buildRecentActivity({}, 10)).toEqual([])
    })

    it('trie les trois flux ensemble, du plus récent au plus ancien', () => {
        const overview = {
            recentCourseProgress: [{courseName: 'Cours A', status: 'COMPLETED', completedAt: '2026-01-01T10:00:00'}],
            recentExerciseProgress: [{exerciseName: 'TP B', status: 'VALIDATED', validatedAt: '2026-01-03T10:00:00'}],
            recentQuizAttempts: [{quizName: 'Quiz C', passed: true, score: 8, maxScore: 10, finishedAt: '2026-01-02T10:00:00'}]
        }

        const activity = buildRecentActivity(overview, 10)

        expect(activity.map((i) => i.text)).toEqual([
            'Exercice corrigé : TP B',
            'Quiz réussi : Quiz C (8/10)',
            'Cours terminé : Cours A'
        ])
    })

    it('écarte les entrées sans date', () => {
        const overview = {
            recentCourseProgress: [
                {courseName: 'Daté', status: 'COMPLETED', completedAt: '2026-01-01T10:00:00'},
                {courseName: 'Sans date', status: 'IN_PROGRESS'}
            ]
        }

        expect(buildRecentActivity(overview, 10)).toHaveLength(1)
    })

    it('respecte la limite demandée', () => {
        const overview = {
            recentCourseProgress: [
                {courseName: 'A', status: 'COMPLETED', completedAt: '2026-01-01T10:00:00'},
                {courseName: 'B', status: 'COMPLETED', completedAt: '2026-01-02T10:00:00'},
                {courseName: 'C', status: 'COMPLETED', completedAt: '2026-01-03T10:00:00'}
            ]
        }

        expect(buildRecentActivity(overview, 2)).toHaveLength(2)
    })

    it('n\'affiche pas de score pour une tentative abandonnée', () => {
        const overview = {
            recentQuizAttempts: [
                {quizName: 'Quiz', abandoned: true, score: null, maxScore: 10, startedAt: '2026-01-01T10:00:00'}
            ]
        }

        expect(buildRecentActivity(overview, 10)[0].text).toBe('Quiz abandonné : Quiz')
    })

    it('n\'affiche pas de score masqué par le mode verdict seul', () => {
        // Le serveur retire le score d'un échec en mode verdict seul : il ne doit pas
        // apparaître sous la forme null/null.
        const overview = {
            recentQuizAttempts: [
                {quizName: 'Quiz', passed: false, score: null, maxScore: null, finishedAt: '2026-01-01T10:00:00'}
            ]
        }

        expect(buildRecentActivity(overview, 10)[0].text).toBe('Quiz tenté : Quiz')
    })

    it('nomme les états d\'exercice comme des événements', () => {
        const overview = {
            recentExerciseProgress: [
                {exerciseName: 'A', status: 'SUBMITTED', submittedAt: '2026-01-03T10:00:00'},
                {exerciseName: 'B', status: 'REJECTED', updatedAt: '2026-01-02T10:00:00'},
                {exerciseName: 'C', status: 'NOT_STARTED', updatedAt: '2026-01-01T10:00:00'}
            ]
        }

        expect(buildRecentActivity(overview, 10).map((i) => i.text)).toEqual([
            'Exercice rendu : A',
            'Exercice à retravailler : B',
            'Exercice : C'
        ])
    })
})
