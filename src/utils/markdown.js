/*
  Conversion Markdown vers HTML nettoyée pour l'affichage avec
  coloration syntaxique des blocs de code.
*/

import {marked} from 'marked'
import {markedHighlight} from 'marked-highlight'
import hljs from 'highlight.js'
import 'highlight.js/styles/atom-one-dark.css'
import DOMPurify from 'dompurify'
import {mediaUrl} from './media'

// Coloration syntaxique :
marked.use(
    markedHighlight({
        langPrefix: 'hljs language-',
        highlight(code, lang) {
            const language = hljs.getLanguage(lang) ? lang : 'plaintext'
            return hljs.highlight(code, {language}).value
        }
    })
)

// Options de rendu : GFM (tableaux, listes de tâches...) et retours à la ligne
// simples convertis en sauts visuels, plus naturel pour un rédacteur non technique.
marked.setOptions({
    gfm: true,
    breaks: true
})

// Les liens s'ouvrent dans un nouvel onglet, de façon sûre.
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A') {
        node.setAttribute('target', '_blank')
        node.setAttribute('rel', 'noopener noreferrer')
    }
    // Les images insérées via l'éditeur portent un chemin relatif (/api/media/...).
    // On le transforme en URL absolue du back sinon le navigateur le résout contre
    // l'origine du front et l'image apparaît cassée.
    if (node.tagName === 'IMG') {
        const src = node.getAttribute('src')
        if (src && !/^https?:\/\//i.test(src) && !src.startsWith('data:')) {
            node.setAttribute('src', mediaUrl(src))
        }
    }
})

/**
 * Convertit un texte Markdown en HTML nettoyé prêt à être injecté.
 * Les classes ajoutées par highlight.js (hljs-*) sont conservées par DOMPurify.
 * @param {string} source texte Markdown
 * @returns {string} HTML sûr
 */
export function renderMarkdown(source) {
    if (!source) {
        return ''
    }
    const rawHtml = marked.parse(source)
    return DOMPurify.sanitize(rawHtml)
}
