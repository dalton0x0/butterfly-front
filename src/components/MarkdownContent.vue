<script setup>
// Rendu formaté d'un contenu Markdown. Utilisé pour l'aperçu côté formateur et
// pour l'affichage côté apprenant. Le HTML est nettoyé en amont (voir markdown.js).
import {computed} from 'vue'
import {renderMarkdown} from '@/utils/markdown'

const props = defineProps({
  source: {type: String, default: ''}
})

const html = computed(() => renderMarkdown(props.source))
</script>

<template>
  <div class="md-content" v-html="html"></div>
</template>

<style scoped>
.md-content {
  color: var(--color-ink);
  font-size: 15px;
  line-height: 1.7;
  word-wrap: break-word;
}

.md-content :deep(h1),
.md-content :deep(h2),
.md-content :deep(h3),
.md-content :deep(h4) {
  color: var(--color-navy);
  font-weight: 600;
  line-height: 1.3;
  margin: 1.4em 0 0.6em;
}

.md-content :deep(h1) {
  font-size: 1.7em;
}

.md-content :deep(h2) {
  font-size: 1.4em;
}

.md-content :deep(h3) {
  font-size: 1.2em;
}

.md-content :deep(h4) {
  font-size: 1.05em;
}

.md-content :deep(p) {
  margin: 0.7em 0;
}

.md-content :deep(ul),
.md-content :deep(ol) {
  margin: 0.7em 0;
  padding-left: 1.5em;
}

.md-content :deep(li) {
  margin: 0.3em 0;
}

.md-content :deep(li > ul),
.md-content :deep(li > ol) {
  margin: 0.3em 0;
}

.md-content :deep(a) {
  color: var(--color-primary);
  text-decoration: underline;
}

.md-content :deep(strong) {
  font-weight: 600;
  color: var(--color-ink);
}

.md-content :deep(blockquote) {
  border-left: 3px solid var(--color-primary);
  background: var(--color-surface-tint);
  margin: 1em 0;
  padding: 0.6em 1em;
  border-radius: 0 8px 8px 0;
  color: var(--color-ink-soft);
}

/* Code en ligne */
.md-content :deep(code) {
  font-family: 'Fira Code', 'Cascadia Code', Consolas, Monaco, monospace;
  font-size: 0.88em;
  background: var(--color-surface-tint);
  color: var(--color-navy);
  padding: 0.15em 0.4em;
  border-radius: 5px;
}

/* Bloc de code */
.md-content :deep(pre) {
  background: #0f172a;
  color: #e2e8f0;
  padding: 1em 1.2em;
  border-radius: 12px;
  overflow-x: auto;
  margin: 1em 0;
  line-height: 1.5;
}

.md-content :deep(pre code) {
  background: transparent;
  color: inherit;
  padding: 0;
  font-size: 0.85em;
}

/* Coloration syntaxique (highlight.js) : on garde notre fond sombre de bloc et on
   laisse le thème colorer les jetons. La classe .hljs impose sinon son propre fond. */
.md-content :deep(pre code.hljs) {
  background: transparent;
  padding: 0;
}

.md-content :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 10px;
  margin: 1em 0;
  display: block;
}

.md-content :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 1em 0;
  font-size: 0.92em;
}

.md-content :deep(th),
.md-content :deep(td) {
  border: 1px solid var(--color-line);
  padding: 0.5em 0.75em;
  text-align: left;
}

.md-content :deep(th) {
  background: var(--color-surface-tint);
  font-weight: 600;
}

.md-content :deep(hr) {
  border: none;
  border-top: 1px solid var(--color-line);
  margin: 1.5em 0;
}

.md-content :deep(:first-child) {
  margin-top: 0;
}

.md-content :deep(:last-child) {
  margin-bottom: 0;
}
</style>
