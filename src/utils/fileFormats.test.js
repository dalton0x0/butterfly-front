import {describe, expect, it} from 'vitest'
import {extensionOf, fileIcon, isAllowedFile} from './fileFormats'
import {fitsInOneSubmission, validateUploadFile} from './upload'
import {validateAttachmentFile} from './attachment'

const MO = 1024 * 1024

describe('extensionOf', () => {
    it('renvoie l\'extension en minuscules', () => {
        expect(extensionOf('Rapport.DOCX')).toBe('docx')
        expect(extensionOf('archive.tar.zip')).toBe('zip')
    })

    it('renvoie une chaîne vide sans extension', () => {
        expect(extensionOf('Makefile')).toBe('')
        expect(extensionOf('')).toBe('')
    })
})

describe('isAllowedFile', () => {
    it('accepte les formats Office et OpenDocument', () => {
        expect(isAllowedFile('rapport.docx')).toBe(true)
        expect(isAllowedFile('budget.ods')).toBe(true)
        expect(isAllowedFile('soutenance.pptx')).toBe(true)
    })

    it('refuse les formats à macros et les exécutables', () => {
        expect(isAllowedFile('rapport.docm')).toBe(false)
        expect(isAllowedFile('ancien.doc')).toBe(false)
        expect(isAllowedFile('programme.exe')).toBe(false)
    })
})

describe('fileIcon', () => {
    it('choisit une icône selon le format', () => {
        expect(fileIcon('notes.pdf')).toBe('picture_as_pdf')
        expect(fileIcon('budget.xlsx')).toBe('table')
        expect(fileIcon('inconnu.bin')).toBe('draft')
    })
})

describe('validateUploadFile', () => {
    it('accepte un .docx dont le navigateur ne connaît pas le type', () => {
        // Cas d'un poste sans Office : file.type est vide.
        expect(validateUploadFile({name: 'rapport.docx', type: '', size: MO})).toBe('')
    })

    it('refuse un fichier de plus de 20 Mo', () => {
        expect(validateUploadFile({name: 'video.zip', type: 'application/zip', size: 21 * MO}))
            .toContain('20 Mo')
    })
})

describe('fitsInOneSubmission', () => {
    it('limite une soumission à 50 Mo au total', () => {
        expect(fitsInOneSubmission([{size: 20 * MO}, {size: 20 * MO}])).toBe(true)
        expect(fitsInOneSubmission([{size: 20 * MO}, {size: 20 * MO}, {size: 11 * MO}])).toBe(false)
    })
})

describe('validateAttachmentFile', () => {
    it('accepte un .md envoyé sans type', () => {
        expect(validateAttachmentFile({name: 'consigne.md', type: '', size: MO})).toBe('')
    })

    it('refuse une pièce jointe de plus de 10 Mo', () => {
        expect(validateAttachmentFile({name: 'support.pdf', type: 'application/pdf', size: 11 * MO}))
            .toContain('10 Mo')
    })
})
