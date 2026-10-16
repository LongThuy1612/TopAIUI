<script setup lang="ts">
// Rendered article HTML (shared/markdown.ts — raw HTML in the source is escaped, so v-html
// only ever gets markdown-it's own tags).
defineProps<{ html: string }>()
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -->
  <div class="article-body" v-html="html" />
</template>

<style scoped>
.article-body { color: #1f2937; font-size: 1.0625rem; line-height: 1.8; overflow-wrap: anywhere; }
.article-body > :deep(* + *) { margin-top: 1.1em; }
.article-body > :deep(:first-child) { margin-top: 0; }
.article-body :deep(h2) { margin-top: 1.8em; font-size: 1.5rem; font-weight: 800; line-height: 1.3; color: #111827; }
.article-body :deep(h3) { margin-top: 1.5em; font-size: 1.25rem; font-weight: 700; line-height: 1.35; color: #111827; }
.article-body :deep(h4), .article-body :deep(h5), .article-body :deep(h6) { margin-top: 1.4em; font-weight: 700; color: #111827; }
.article-body :deep(a) { color: #e11d74; text-decoration: underline; text-underline-offset: 2px; }
.article-body :deep(ul) { list-style: disc; padding-left: 1.5em; }
.article-body :deep(ol) { list-style: decimal; padding-left: 1.5em; }
.article-body :deep(li + li) { margin-top: 0.35em; }
.article-body :deep(blockquote) { border-left: 4px solid #FEDCD3; padding-left: 1em; color: #4b5563; font-style: italic; }
.article-body :deep(img) { max-width: 100%; height: auto; border-radius: 12px; }
.article-body :deep(code) { background: #f3f4f6; border-radius: 4px; padding: 0.1em 0.35em; font-size: 0.9em; }
.article-body :deep(pre) { background: #111827; color: #f9fafb; border-radius: 12px; padding: 1em; overflow-x: auto; font-size: 0.875rem; }
.article-body :deep(pre code) { background: none; padding: 0; color: inherit; }
.article-body :deep(hr) { border-color: #e5e7eb; }
.article-body :deep(table) { width: 100%; border-collapse: collapse; font-size: 0.95em; display: block; overflow-x: auto; }
.article-body :deep(th), .article-body :deep(td) { border: 1px solid #e5e7eb; padding: 0.5em 0.75em; text-align: left; }
.article-body :deep(th) { background: #f9fafb; font-weight: 700; }
</style>
