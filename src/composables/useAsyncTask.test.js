import {describe, it, expect} from 'vitest'
import {useAsyncTask} from './useAsyncTask.js'

const defer = () => {
    let resolve, reject
    const promise = new Promise((res, rej) => {
        resolve = res
        reject = rej
    })
    return {promise, resolve, reject}
}

describe('déroulement nominal', () => {
    it('rend le résultat de la tâche', async () => {
        const {run} = useAsyncTask()
        await expect(run(async () => 'valeur')).resolves.toBe('valeur')
    })

    it('passe en chargement pendant la tâche puis en sort', async () => {
        const {loading, run} = useAsyncTask()
        const {promise, resolve} = defer()

        const pending = run(() => promise)
        expect(loading.value).toBe(true)

        resolve('fini')
        await pending
        expect(loading.value).toBe(false)
    })

    it('efface une erreur précédente au lancement suivant', async () => {
        const {error, run} = useAsyncTask()

        await run(async () => {
            throw new Error('première panne')
        })
        expect(error.value).toBe('première panne')

        await run(async () => 'ok')
        expect(error.value).toBe('')
    })
})

describe('traitement de l\'erreur', () => {
    it('retient le message porté par l\'erreur', async () => {
        const {error, run} = useAsyncTask('Repli.')
        await run(async () => {
            throw new Error('Le serveur a répondu 500.')
        })
        expect(error.value).toBe('Le serveur a répondu 500.')
    })

    it('retombe sur le message fourni quand l\'erreur est muette', async () => {
        const {error, run} = useAsyncTask('Impossible de charger les badges.')
        await run(async () => {
            throw new Error('')
        })
        expect(error.value).toBe('Impossible de charger les badges.')
    })

    it('a un repli par défaut', async () => {
        const {error, run} = useAsyncTask()
        await run(async () => {
            throw new Error('')
        })
        expect(error.value).toBe('Une erreur est survenue.')
    })

    it('rend undefined et ne propage pas l\'exception', async () => {
        const {run} = useAsyncTask()
        await expect(run(async () => {
            throw new Error('panne')
        })).resolves.toBeUndefined()
    })

    it('quitte le chargement même en erreur', async () => {
        const {loading, run} = useAsyncTask()
        await run(async () => {
            throw new Error('panne')
        })
        expect(loading.value).toBe(false)
    })
})

describe('réponses périmées', () => {
    it('ignore le résultat d\'un appel dépassé par un plus récent', async () => {
        const {run} = useAsyncTask()
        const premier = defer()
        const second = defer()

        const ancien = run(() => premier.promise)
        const recent = run(() => second.promise)

        second.resolve('récent')
        await recent

        premier.resolve('ancien')
        await expect(ancien).resolves.toBeUndefined()
    })

    it('ignore l\'erreur d\'un appel dépassé', async () => {
        const {error, run} = useAsyncTask()
        const premier = defer()
        const second = defer()

        const ancien = run(() => premier.promise)
        const recent = run(() => second.promise)

        second.resolve('récent')
        await recent

        premier.reject(new Error('panne périmée'))
        await ancien

        expect(error.value).toBe('')
    })

    it('reste en chargement tant que le dernier appel n\'est pas revenu', async () => {
        const {loading, run} = useAsyncTask()
        const premier = defer()
        const second = defer()

        const ancien = run(() => premier.promise)
        const recent = run(() => second.promise)

        premier.resolve('ancien')
        await ancien
        expect(loading.value).toBe(true)

        second.resolve('récent')
        await recent
        expect(loading.value).toBe(false)
    })
})

describe('état initial', () => {
    it('n\'est pas en chargement par défaut', () => {
        expect(useAsyncTask().loading.value).toBe(false)
    })

    it('part en chargement quand la tâche est lancée au montage', () => {
        expect(useAsyncTask('Repli.', {loadingFromStart: true}).loading.value).toBe(true)
    })

    it('retombe à faux après le premier appel', async () => {
        const {loading, run} = useAsyncTask('Repli.', {loadingFromStart: true})
        await run(async () => 'ok')
        expect(loading.value).toBe(false)
    })

    it('démarre sans erreur', () => {
        expect(useAsyncTask().error.value).toBe('')
    })
})
