/*
  Configuration d'affichage de l'application, alimentée par les variables
  d'environnement Vite avec des valeurs de repli.

  VITE_APP_TAGLINE : slogan du pied de page. Les lignes sont séparées par
  le caractère "|" car un fichier .env ne permet pas de saut de ligne.
  Exemple : "Ligne 1|Ligne 2|Ligne 3".
*/

const appName = import.meta.env.VITE_APP_NAME || 'Butterfly'

const DEFAULT_TAGLINE =
    'Apprendre, évoluer, se transformer.' +
    '|Chaque parcours est une métamorphose :' +
    '|formez-vous à votre rythme dans tous les domaines.'

const tagLine = import.meta.env.VITE_APP_TAG_LINE || DEFAULT_TAGLINE

// Découpage en lignes (espaces superflus et lignes vides retirés).
const taglineLines = (tagLine)
    .split('|')
    .map((line) => line.trim())
    .filter(Boolean)

export default {
    appName,
    taglineLines,
}
