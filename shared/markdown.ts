import MarkdownIt from 'markdown-it'

// Articles (/ai-news) and guest posts are written in Markdown and rendered here — on the
// server for the public page and in the browser for the editor preview, so both show the
// same thing. Raw HTML is off (escaped), and markdown-it refuses javascript: / vbscript:
// links, so customer content can't inject script.
//
// Links leaving the site open in a new tab with rel = linkRel ('dofollow' → plain
// "noopener"; 'sponsored' → "sponsored noopener"). # headings become <h2> (the page
// title is the only <h1>).

export const externalLinkRel = (linkRel: 'dofollow' | 'sponsored') => linkRel === 'sponsored' ? 'sponsored noopener' : 'noopener'

export interface ArticleStats { words: number; externalLinks: string[]; images: string[] }

function createRenderer(linkRel: 'dofollow' | 'sponsored') {
  const md = new MarkdownIt({ html: false, linkify: true, typographer: false, breaks: false })
  // Bare URLs (https://…) become links, product names like "Perplexity.ai" stay text —
  // otherwise every such name would be a dofollow link counted against the link limit.
  md.linkify.set({ fuzzyLink: false, fuzzyEmail: false })
  // Anything that leaves the site: a scheme (https:, mailto:…) or protocol-relative //host —
  // the latter would otherwise slip past the link limit and the rel attribute.
  const isExternal = (href: string) => /^([a-z][a-z0-9+.-]*:|\/\/)/i.test(href)

  md.renderer.rules.link_open = (tokens, idx, options, _env, self) => {
    const token = tokens[idx]!
    const href = token.attrGet('href') ?? ''
    if (isExternal(href)) {
      token.attrSet('target', '_blank')
      token.attrSet('rel', externalLinkRel(linkRel))
    }
    return self.renderToken(tokens, idx, options)
  }
  md.renderer.rules.heading_open = (tokens, idx, options, _env, self) => {
    const token = tokens[idx]!
    if (token.tag === 'h1') token.tag = 'h2'
    return self.renderToken(tokens, idx, options)
  }
  md.renderer.rules.heading_close = (tokens, idx, options, _env, self) => {
    const token = tokens[idx]!
    if (token.tag === 'h1') token.tag = 'h2'
    return self.renderToken(tokens, idx, options)
  }
  md.renderer.rules.image = (tokens, idx, options, env, self) => {
    tokens[idx]!.attrSet('loading', 'lazy')
    return self.renderToken(tokens, idx, options)
  }

  // Words of the text (not of URLs / markup) and every http(s) link, written or bare.
  function stats(source: string): ArticleStats {
    let words = 0
    const externalLinks: string[] = []
    const images: string[] = []
    const walk = (tokens: ReturnType<typeof md.parse>) => {
      for (const t of tokens) {
        if (t.type === 'text' || t.type === 'code_inline') words += t.content.split(/\s+/).filter(Boolean).length
        if (t.type === 'link_open') {
          const href = t.attrGet('href') ?? ''
          if (isExternal(href)) externalLinks.push(href)
        }
        if (t.type === 'image') images.push(t.attrGet('src') ?? '')
        if (t.children) walk(t.children)
      }
    }
    walk(md.parse(source, {}))
    return { words, externalLinks, images }
  }

  // The href markdown-it stores for `url` (percent-encoded the same way as in stats()).
  const normalizeLink = (url: string) => md.normalizeLink(url)

  return { render: (source: string) => md.render(source), stats, normalizeLink }
}

const renderers = new Map<string, ReturnType<typeof createRenderer>>()
export function markdownRenderer(linkRel: 'dofollow' | 'sponsored') {
  let r = renderers.get(linkRel)
  if (!r) renderers.set(linkRel, (r = createRenderer(linkRel)))
  return r
}
