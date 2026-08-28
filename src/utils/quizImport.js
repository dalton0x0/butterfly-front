// Lecture et contrôle d'un fichier JSON de questions de quiz.
// Les règles reproduisent celles du back (QuestionRequest et AnswerOptionRequest)
// pour que le formateur voie ses erreurs à l'import et non à l'enregistrement.

export const QUESTION_TYPES = ['SINGLE_CHOICE', 'MULTIPLE_CHOICE']

export const MAX_IMPORT_SIZE_BYTES = 1024 * 1024
export const MAX_IMPORT_QUESTIONS = 200

const MAX_STATEMENT_LENGTH = 2000
const MAX_OPTION_TEXT_LENGTH = 1000
const MIN_OPTIONS = 2
const MIN_TIME_LIMIT = 5
const MAX_TIME_LIMIT = 3600

/**
 * Modèle téléchargeable, montré au formateur comme exemple de structure attendue.
 */
export const IMPORT_TEMPLATE = JSON.stringify({
  questions: [
    {
      statement: 'Quelle commande affiche le contenu d\'un dossier ?',
      type: 'SINGLE_CHOICE',
      points: 1,
      timeLimitSeconds: 30,
      options: [
        {text: 'ls', correct: true},
        {text: 'cd', correct: false},
        {text: 'rm', correct: false}
      ]
    },
    {
      statement: 'Quels protocoles fonctionnent sur la couche transport ?',
      type: 'MULTIPLE_CHOICE',
      points: 2,
      timeLimitSeconds: null,
      options: [
        {text: 'TCP', correct: true},
        {text: 'UDP', correct: true},
        {text: 'HTTP', correct: false}
      ]
    }
  ]
}, null, 2)

/**
 * Vérifie la taille du fichier avant de le lire.
 *
 * @param {File} file le fichier choisi par le formateur
 * @returns {string} un message d'erreur, ou une chaîne vide si le fichier convient
 */
export function validateImportFile(file) {
  if (!file) {
    return 'Aucun fichier sélectionné.'
  }
  if (file.size > MAX_IMPORT_SIZE_BYTES) {
    return 'Le fichier dépasse 1 Mo.'
  }
  return ''
}

/**
 * Analyse le contenu d'un fichier JSON de questions.
 * Accepte soit un objet avec une clé questions, soit directement un tableau.
 *
 * @param {string} text le contenu brut du fichier
 * @returns {{questions: Array, errors: Array<string>}} les questions normalisées et les erreurs
 */
export function parseQuestionsFile(text) {
  let payload
  try {
    payload = JSON.parse(text)
  } catch {
    return {questions: [], errors: ['Le fichier n\'est pas un JSON valide.']}
  }

  const rawQuestions = Array.isArray(payload) ? payload : payload?.questions

  if (!Array.isArray(rawQuestions)) {
    return {questions: [], errors: ['Le fichier doit contenir un tableau "questions".']}
  }
  if (rawQuestions.length === 0) {
    return {questions: [], errors: ['Le fichier ne contient aucune question.']}
  }
  if (rawQuestions.length > MAX_IMPORT_QUESTIONS) {
    return {questions: [], errors: [`Le fichier contient plus de ${MAX_IMPORT_QUESTIONS} questions.`]}
  }

  const questions = []
  const errors = []

  rawQuestions.forEach((raw, index) => {
    const {question, error} = normalizeQuestion(raw, index)
    if (error) {
      errors.push(error)
    } else {
      questions.push(question)
    }
  })

  return {questions, errors}
}

/**
 * Contrôle et met en forme une question brute pour l'éditeur.
 *
 * @param {object} raw la question telle qu'elle figure dans le fichier
 * @param {number} index son rang, utilisé dans les messages d'erreur
 * @returns {{question: object|null, error: string}} la question normalisée ou l'erreur
 */
function normalizeQuestion(raw, index) {
  const label = `Question ${index + 1}`

  if (!raw || typeof raw !== 'object') {
    return fail(`${label} : format inattendu, un objet est attendu.`)
  }

  const statement = typeof raw.statement === 'string' ? raw.statement.trim() : ''
  if (!statement) {
    return fail(`${label} : l'énoncé est obligatoire.`)
  }
  if (statement.length > MAX_STATEMENT_LENGTH) {
    return fail(`${label} : l'énoncé dépasse ${MAX_STATEMENT_LENGTH} caractères.`)
  }

  // Le type est facultatif dans le fichier : sans lui, on retient le choix simple.
  const type = raw.type ?? 'SINGLE_CHOICE'
  if (!QUESTION_TYPES.includes(type)) {
    return fail(`${label} : type inconnu "${raw.type}". Valeurs acceptées : ${QUESTION_TYPES.join(', ')}.`)
  }

  const points = raw.points ?? 1
  if (!Number.isInteger(points) || points < 1) {
    return fail(`${label} : les points doivent être un entier strictement positif.`)
  }

  const timeLimitError = validateTimeLimit(raw.timeLimitSeconds, label)
  if (timeLimitError) {
    return fail(timeLimitError)
  }

  const {options, error} = normalizeOptions(raw.options, label, type)
  if (error) {
    return fail(error)
  }

  return {
    question: {
      statement,
      type,
      points,
      timeLimitSeconds: raw.timeLimitSeconds == null ? '' : raw.timeLimitSeconds,
      options
    },
    error: ''
  }
}

/**
 * Contrôle la durée d'une question, qui reste facultative.
 */
function validateTimeLimit(value, label) {
  if (value == null) {
    return ''
  }
  if (!Number.isInteger(value) || value < MIN_TIME_LIMIT || value > MAX_TIME_LIMIT) {
    return `${label} : la durée doit être un entier entre ${MIN_TIME_LIMIT} et ${MAX_TIME_LIMIT} secondes.`
  }
  return ''
}

/**
 * Contrôle et met en forme les options d'une question.
 *
 * @param {Array} raw les options telles qu'elles figurent dans le fichier
 * @param {string} label le libellé de la question, pour les messages
 * @param {string} type le type de question, qui fixe le nombre de bonnes réponses
 * @returns {{options: Array, error: string}} les options normalisées ou l'erreur
 */
function normalizeOptions(raw, label, type) {
  if (!Array.isArray(raw) || raw.length < MIN_OPTIONS) {
    return {options: [], error: `${label} : au moins ${MIN_OPTIONS} options sont requises.`}
  }

  const options = []

  for (const [index, item] of raw.entries()) {
    const position = `${label}, option ${index + 1}`

    if (!item || typeof item !== 'object') {
      return {options: [], error: `${position} : format inattendu, un objet est attendu.`}
    }

    const text = typeof item.text === 'string' ? item.text.trim() : ''
    if (!text) {
      return {options: [], error: `${position} : le texte est obligatoire.`}
    }
    if (text.length > MAX_OPTION_TEXT_LENGTH) {
      return {options: [], error: `${position} : le texte dépasse ${MAX_OPTION_TEXT_LENGTH} caractères.`}
    }

    options.push({text, correct: item.correct === true})
  }

  const correctCount = options.filter((option) => option.correct).length

  if (type === 'SINGLE_CHOICE' && correctCount !== 1) {
    return {options: [], error: `${label} : un choix simple doit avoir exactement une bonne réponse.`}
  }
  if (type === 'MULTIPLE_CHOICE' && correctCount < 1) {
    return {options: [], error: `${label} : un choix multiple doit avoir au moins une bonne réponse.`}
  }

  return {options, error: ''}
}

function fail(message) {
  return {question: null, error: message}
}
