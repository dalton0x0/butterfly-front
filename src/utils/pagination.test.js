import {describe, it, expect, vi, afterEach} from 'vitest'
import {normalizePage, buildPageParams, MAX_PAGE_SIZE, DEFAULT_PAGE_SIZE} from '@/utils/pagination.js'

afterEach(() => {
    vi.restoreAllMocks()
})

describe('normalizePage', () => {
    it('traduit une page Spring Data complète', () => {
        expect(normalizePage({
            content: [{id: 1}, {id: 2}],
            totalElements: 42,
            totalPages: 3,
            number: 1,
            size: 20,
            first: false,
            last: false
        })).toEqual({
            items: [{id: 1}, {id: 2}],
            totalElements: 42,
            totalPages: 3,
            page: 1,
            size: 20,
            isFirst: false,
            isLast: false
        })
    })

    it.each([undefined, null, {}])('reste exploitable face à %o', (page) => {
        expect(normalizePage(page)).toEqual({
            items: [],
            totalElements: 0,
            totalPages: 0,
            page: 0,
            size: 0,
            isFirst: true,
            isLast: true
        })
    })

    it('conserve une page vide sans la confondre avec une absence de réponse', () => {
        const result = normalizePage({content: [], totalElements: 0, totalPages: 0, number: 0, size: 20})
        expect(result.items).toEqual([])
        expect(result.size).toBe(20)
    })
})

describe('buildPageParams', () => {
    it('applique les valeurs par défaut', () => {
        expect(buildPageParams()).toEqual({page: 0, size: 20})
    })

    it('omet le tri quand il n\'est pas demandé', () => {
        expect(buildPageParams({page: 2, size: 50})).not.toHaveProperty('sort')
    })

    it('transmet le tri tel quel', () => {
        expect(buildPageParams({sort: 'lastName,asc'}).sort).toBe('lastName,asc')
    })

    it('rabaisse une taille au dessus du plafond serveur', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
        expect(buildPageParams({size: 500}).size).toBe(MAX_PAGE_SIZE)
        expect(warn).toHaveBeenCalledOnce()
    })

    it('laisse passer la taille maximale sans avertir', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
        expect(buildPageParams({size: MAX_PAGE_SIZE}).size).toBe(MAX_PAGE_SIZE)
        expect(warn).not.toHaveBeenCalled()
    })

    it('garde la taille par défaut sous le plafond', () => {
        expect(DEFAULT_PAGE_SIZE).toBeLessThanOrEqual(MAX_PAGE_SIZE)
    })
})
