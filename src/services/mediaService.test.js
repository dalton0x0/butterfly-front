import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest'
import http from '@/services/http.js'
import {mediaService, MEDIA_USAGE} from '@/services/mediaService.js'

// Visiteur sans session : le client HTTP n'ajoute aucun jeton et ne tente aucun
// renouvellement. Le stockage réel, qui lit localStorage, n'est pas sollicité.
vi.mock('@/services/tokenStorage.js', () => ({
    tokenStorage: {getAccess: () => null, getRefresh: () => null, set: () => {}, clear: () => {}}
}))

// Les routes des médias ne sont pas versionnées côté back (/api/media/..., et non
// /api/v1/media/...) : les URL enregistrées dans les contenus doivent rester valables
// quelle que soit la version de l'API. Ces tests vérifient l'adresse réellement appelée.
describe('mediaService', () => {
    let originalAdapter
    let requests

    beforeEach(() => {
        requests = []
        originalAdapter = http.defaults.adapter
        // Faux transport : la requête est enregistrée au lieu d'être envoyée.
        http.defaults.adapter = async (config) => {
            requests.push(config)
            return {data: {data: {}}, status: 200, statusText: 'OK', headers: {}, config}
        }
    })

    afterEach(() => {
        http.defaults.adapter = originalAdapter
    })

    const calledPath = () => new URL(http.getUri(requests[0])).pathname

    it('envoie une image sur la route non versionnée', async () => {
        await mediaService.uploadImage(new File(['x'], 'a.png'), MEDIA_USAGE.AVATAR)
        expect(calledPath()).toBe('/api/media/images')
    })

    it('envoie une vidéo sur la route non versionnée', async () => {
        await mediaService.uploadVideo(new File(['x'], 'a.mp4'))
        expect(calledPath()).toBe('/api/media/videos')
    })

    it('supprime un média sur la route non versionnée', async () => {
        await mediaService.deleteMedia('/api/media/images/avatars/a.png')
        expect(calledPath()).toBe('/api/media')
    })
})
