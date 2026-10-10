// GPT Store (/gpts) — shared by the pages and the server.

// Categories of the official GPT Store, plus "other". Labels: i18n gpts.categories.<key>.
export const GPT_CATEGORIES = ['writing', 'productivity', 'research', 'education', 'lifestyle', 'programming', 'image', 'other'] as const
export type GptCategory = (typeof GPT_CATEGORIES)[number]
export const isGptCategory = (v: unknown): v is GptCategory => GPT_CATEGORIES.includes(v as GptCategory)

// "https://chatgpt.com/g/g-abc123-my-gpt" (or chat.openai.com) → "g-abc123"; null when the
// link isn't a GPT link. The id is the part before the readable name.
export function gizmoIdOf(link: unknown): string | null {
  let u: URL
  try { u = new URL(String(link ?? '').trim()) } catch { return null }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null
  if (!['chatgpt.com', 'www.chatgpt.com', 'chat.openai.com'].includes(u.hostname.toLowerCase())) return null
  const m = u.pathname.match(/^\/g\/(g-[A-Za-z0-9]+)(?:-[\w-]*)?\/?$/)
  return m ? m[1]! : null
}

export const gptUrlOf = (gizmoId: string) => `https://chatgpt.com/g/${gizmoId}`
