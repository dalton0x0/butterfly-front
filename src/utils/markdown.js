/*
  Conversion Markdown vers HTML nettoyée pour l'affichage avec
  coloration syntaxique des blocs de code.
*/

import {marked} from 'marked'
import {markedHighlight} from 'marked-highlight'
// Import du noyau seul plutôt que du paquet complet.
// On n'enregistre que les langages susceptibles d'apparaître dans les cours.
import hljs from 'highlight.js/lib/core'
import plaintext from 'highlight.js/lib/languages/plaintext'
import bash from 'highlight.js/lib/languages/bash'
import shell from 'highlight.js/lib/languages/shell'
import xml from 'highlight.js/lib/languages/xml'
import css from 'highlight.js/lib/languages/css'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import json from 'highlight.js/lib/languages/json'
import java from 'highlight.js/lib/languages/java'
import php from 'highlight.js/lib/languages/php'
import python from 'highlight.js/lib/languages/python'
import sql from 'highlight.js/lib/languages/sql'
import yaml from 'highlight.js/lib/languages/yaml'
import dockerfile from 'highlight.js/lib/languages/dockerfile'
import 'highlight.js/styles/atom-one-dark.css'
import DOMPurify from 'dompurify'
import {mediaUrl} from './media'

// Enregistrement des langages (le nom sert d'identifiant dans les blocs ```lang).
hljs.registerLanguage('plaintext', plaintext)
hljs.registerLanguage('bash', bash)
hljs.registerLanguage('shell', shell)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('css', css)
hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('json', json)
hljs.registerLanguage('java', java)
hljs.registerLanguage('php', php)
hljs.registerLanguage('python', python)
hljs.registerLanguage('sql', sql)
hljs.registerLanguage('yaml', yaml)
hljs.registerLanguage('dockerfile', dockerfile)

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
