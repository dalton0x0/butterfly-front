import {describe, it, expect} from 'vitest'
import {
    parseQuestionsFile,
    validateImportFile,
    IMPORT_TEMPLATE,
    MAX_IMPORT_QUESTIONS,
    MAX_IMPORT_SIZE_BYTES
} from '@/utils/quizImport.js'

/** Construit une question valide, que chaque test déforme à sa guise. */
function aQuestion(overrides = {}) {
    return {
        statement: 'Quelle commande liste un dossier ?',
        type: 'SINGLE_CHOICE',
        points: 1,
        timeLimitSeconds: 30,
        options: [
            {text: 'ls', correct: true},
            {text: 'cd', correct: false}
        ],
        ...overrides
    }
}

const fileOf = (questions) => JSON.stringify({questions})

describe('validateImportFile', () => {
    it('refuse l\'absence de fichier', () => {
        expect(validateImportFile(null)).toBe('Aucun fichier sélectionné.')
    })

    it('refuse un fichier au dessus de 1 Mo', () => {
        expect(validateImportFile({size: MAX_IMPORT_SIZE_BYTES + 1})).toBe('Le fichier dépasse 1 Mo.')
    })

    it('accepte un fichier exactement à la limite', () => {
        expect(validateImportFile({size: MAX_IMPORT_SIZE_BYTES})).toBe('')
    })
})

describe('parseQuestionsFile, structure du fichier', () => {
    it('refuse un JSON illisible sans lever d\'exception', () => {
        const result = parseQuestionsFile('{ceci n\'est pas du json')
        expect(result.questions).toEqual([])
        expect(result.errors).toEqual(["Le fichier n'est pas un JSON valide."])
    })

    it('accepte un tableau nu autant qu\'un objet à clé questions', () => {
        expect(parseQuestionsFile(JSON.stringify([aQuestion()])).questions).toHaveLength(1)
        expect(parseQuestionsFile(fileOf([aQuestion()])).questions).toHaveLength(1)
    })

    it('refuse un contenu sans tableau exploitable', () => {
        expect(parseQuestionsFile('{"autre": 1}').errors)
            .toEqual(['Le fichier doit contenir un tableau "questions".'])
    })

    it('refuse un tableau vide', () => {
        expect(parseQuestionsFile(fileOf([])).errors)
            .toEqual(['Le fichier ne contient aucune question.'])
    })

    it(`refuse au delà de ${MAX_IMPORT_QUESTIONS} questions`, () => {
        const trop = Array.from({length: MAX_IMPORT_QUESTIONS + 1}, () => aQuestion())
        expect(parseQuestionsFile(fileOf(trop)).errors)
            .toEqual([`Le fichier contient plus de ${MAX_IMPORT_QUESTIONS} questions.`])
    })

    it('accepte exactement la limite', () => {
        const limite = Array.from({length: MAX_IMPORT_QUESTIONS}, () => aQuestion())
        expect(parseQuestionsFile(fileOf(limite)).questions).toHaveLength(MAX_IMPORT_QUESTIONS)
    })

    it('analyse le modèle téléchargeable proposé au formateur', () => {
        const result = parseQuestionsFile(IMPORT_TEMPLATE)
        expect(result.errors).toEqual([])
        expect(result.questions).toHaveLength(2)
    })
})

describe('parseQuestionsFile, contrôle d\'une question', () => {
    it('conserve les questions valides et signale les autres', () => {
        const result = parseQuestionsFile(fileOf([
            aQuestion(),
            aQuestion({statement: ''}),
            aQuestion({statement: 'Troisième question ?'})
        ]))
        expect(result.questions).toHaveLength(2)
        expect(result.errors).toEqual(["Question 2 : l'énoncé est obligatoire."])
    })

    it('numérote les erreurs selon le rang dans le fichier', () => {
        const result = parseQuestionsFile(fileOf([aQuestion(), aQuestion({points: 0})]))
        expect(result.errors[0]).toMatch(/^Question 2 /)
    })

    it('retient le choix simple quand le type est absent', () => {
        const {type} = parseQuestionsFile(fileOf([aQuestion({type: undefined})])).questions[0]
        expect(type).toBe('SINGLE_CHOICE')
    })

    it('refuse un type inconnu en rappelant les valeurs acceptées', () => {
        const result = parseQuestionsFile(fileOf([aQuestion({type: 'OPEN'})]))
        expect(result.errors[0]).toContain('SINGLE_CHOICE, MULTIPLE_CHOICE')
    })

    it('applique un point par défaut', () => {
        expect(parseQuestionsFile(fileOf([aQuestion({points: undefined})])).questions[0].points).toBe(1)
    })

    it.each([0, -1, 1.5, '2'])('refuse des points valant %o', (points) => {
        expect(parseQuestionsFile(fileOf([aQuestion({points})])).errors[0])
            .toContain('entier strictement positif')
    })

    it('coupe les espaces autour de l\'énoncé', () => {
        const {statement} = parseQuestionsFile(
            fileOf([aQuestion({statement: '  Une question ?  '})])
        ).questions[0]
        expect(statement).toBe('Une question ?')
    })

    it('refuse un énoncé au delà de 2000 caractères', () => {
        expect(parseQuestionsFile(fileOf([aQuestion({statement: 'a'.repeat(2001)})])).errors[0])
            .toContain('dépasse 2000 caractères')
    })
})

describe('parseQuestionsFile, durée facultative', () => {
    it('traduit une durée absente en chaîne vide pour l\'éditeur', () => {
        const {timeLimitSeconds} = parseQuestionsFile(
            fileOf([aQuestion({timeLimitSeconds: null})])
        ).questions[0]
        expect(timeLimitSeconds).toBe('')
    })

    it.each([4, 3601, 12.5, '30'])('refuse une durée valant %o', (timeLimitSeconds) => {
        expect(parseQuestionsFile(fileOf([aQuestion({timeLimitSeconds})])).errors[0])
            .toContain('entre 5 et 3600 secondes')
    })

    it.each([5, 3600])('accepte la borne %i', (timeLimitSeconds) => {
        expect(parseQuestionsFile(fileOf([aQuestion({timeLimitSeconds})])).errors).toEqual([])
    })
})

describe('parseQuestionsFile, contrôle des options', () => {
    it('exige au moins deux options', () => {
        expect(parseQuestionsFile(fileOf([aQuestion({options: [{text: 'ls', correct: true}]})])).errors[0])
            .toContain('au moins 2 options')
    })

    it('situe l\'erreur sur la bonne option', () => {
        const result = parseQuestionsFile(fileOf([aQuestion({
            options: [{text: 'ls', correct: true}, {text: '   ', correct: false}]
        })]))
        expect(result.errors[0]).toBe('Question 1, option 2 : le texte est obligatoire.')
    })

    it('traite toute valeur autre que true comme une mauvaise réponse', () => {
        const {options} = parseQuestionsFile(fileOf([aQuestion({
            options: [{text: 'ls', correct: true}, {text: 'cd', correct: 'true'}]
        })])).questions[0]
        expect(options[1].correct).toBe(false)
    })

    it('exige exactement une bonne réponse en choix simple', () => {
        const deux = aQuestion({options: [{text: 'ls', correct: true}, {text: 'dir', correct: true}]})
        expect(parseQuestionsFile(fileOf([deux])).errors[0]).toContain('exactement une bonne réponse')

        const aucune = aQuestion({options: [{text: 'ls', correct: false}, {text: 'cd', correct: false}]})
        expect(parseQuestionsFile(fileOf([aucune])).errors[0]).toContain('exactement une bonne réponse')
    })

    it('accepte plusieurs bonnes réponses en choix multiple', () => {
        const question = aQuestion({
            type: 'MULTIPLE_CHOICE',
            options: [{text: 'TCP', correct: true}, {text: 'UDP', correct: true}]
        })
        expect(parseQuestionsFile(fileOf([question])).errors).toEqual([])
    })

    it('exige au moins une bonne réponse en choix multiple', () => {
        const question = aQuestion({
            type: 'MULTIPLE_CHOICE',
            options: [{text: 'TCP', correct: false}, {text: 'UDP', correct: false}]
        })
        expect(parseQuestionsFile(fileOf([question])).errors[0]).toContain('au moins une bonne réponse')
    })
})
