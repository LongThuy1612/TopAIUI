// POST /api/promote/checkout
// Nhận đơn từ các trang promote, kiểm tra lại giá ở server (không tin số tiền
// từ client), tạo đơn PENDING + phiên Stripe Checkout rồi trả về checkoutUrl.
// Việc ghi nhận thanh toán do webhook /api/stripe/webhook làm.
import {
  submitAi, submitGpt, updateAi, advertise, creditTotal, MAX_CREDITS_PER_ORDER
} from '#shared/promote'

type Body =
  | { type: 'submit-ai'; name: string; url: string; mode: 'auto' | 'manual' }
  | { type: 'advertise'; toolId: string; landingUrl?: string; clicks: number }
  | { type: 'guest-post'; credits: number }
  | { type: 'update-ai'; toolId: string }
  | { type: 'submit-gpt'; gptUrl: string }

// Trang mà Stripe đưa người dùng quay về sau khi trả / huỷ.
const returnPath: Record<Body['type'], string> = {
  'submit-ai': '/submit',
  'advertise': '/advertise',
  'guest-post': '/post-or-insert',
  'update-ai': '/update-ai',
  'submit-gpt': '/submit-gpt'
}

const isUrl = (s: unknown) => {
  try { return ['http:', 'https:'].includes(new URL(String(s)).protocol) } catch { return false }
}

const bad = (message: string) => createError({ statusCode: 400, statusMessage: message, message })

async function requireTool(toolId: unknown) {
  if (typeof toolId !== 'string' || !toolId) throw bad('Tool is required.')
  const tool = await prisma.tool.findFirst({
    where: { id: toolId, status: 'PUBLISHED', deletedAt: null },
    select: { id: true, name: true }
  })
  if (!tool) throw bad('Tool not found.')
  return tool
}

// Trả về số tiền (USD), tên hiển thị trên Stripe và payload đã được làm sạch để lưu.
async function priceOf(b: Body): Promise<{ amount: number; label: string; payload: Record<string, unknown> }> {
  switch (b?.type) {
    case 'submit-ai': {
      const name = String(b.name ?? '').trim()
      if (!name || !isUrl(b.url)) throw bad('Invalid tool name or URL.')
      const mode = b.mode === 'manual' ? 'manual' : 'auto'
      return { amount: submitAi.price, label: `Submit AI: ${name}`, payload: { name, url: String(b.url).trim(), mode } }
    }
    case 'submit-gpt': {
      if (!isUrl(b.gptUrl)) throw bad('Invalid GPT link.')
      return { amount: submitGpt.price, label: 'Submit GPT', payload: { gptUrl: String(b.gptUrl).trim() } }
    }
    case 'update-ai': {
      const tool = await requireTool(b.toolId)
      return { amount: updateAi.price, label: `Update AI: ${tool.name}`, payload: { toolId: tool.id, toolName: tool.name } }
    }
    case 'advertise': {
      const pkg = advertise.packages.find(p => p.clicks === Number(b.clicks))
      if (!pkg) throw bad('Invalid package.')
      if (b.landingUrl && !isUrl(b.landingUrl)) throw bad('Invalid landing URL.')
      const tool = await requireTool(b.toolId)
      return {
        amount: +(pkg.clicks * pkg.costPerClick).toFixed(2),
        label: `Advertise ${tool.name}: ${pkg.clicks.toLocaleString('en-US')} clicks`,
        payload: { toolId: tool.id, toolName: tool.name, clicks: pkg.clicks, landingUrl: b.landingUrl?.trim() || null }
      }
    }
    case 'guest-post': {
      const credits = Number(b.credits)
      if (!Number.isInteger(credits) || credits < 1 || credits > MAX_CREDITS_PER_ORDER) throw bad('Invalid credits.')
      return {
        amount: creditTotal(credits),
        label: `${credits} guest post / link insert credit${credits > 1 ? 's' : ''}`,
        payload: { credits }
      }
    }
    default:
      throw bad('Unknown order type.')
  }
}

export default defineEventHandler(async (event) => {
  const userId = requireUser(event)
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user || user.isBanned || user.deletedAt) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const body = await readBody<Body>(event)
  const { amount, label, payload } = await priceOf(body)
  const amountCents = Math.round(amount * 100)

  const stripe = useStripe()
  const { public: { siteUrl } } = useRuntimeConfig()
  const back = `${siteUrl}${returnPath[body.type]}`

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{
      quantity: 1,
      price_data: { currency: 'usd', unit_amount: amountCents, product_data: { name: label } }
    }],
    ...(user.stripeCustomerId
      ? { customer: user.stripeCustomerId }
      : { customer_email: user.email, customer_creation: 'always' as const }),
    client_reference_id: user.id,
    metadata: { userId: user.id, type: body.type },
    success_url: `${back}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${back}?canceled=1`
  })

  const order = await prisma.promoteOrder.create({
    data: { userId: user.id, type: body.type, payload, stripeSessionId: session.id, amount: amountCents }
  })

  return { orderId: order.id, checkoutUrl: session.url }
})
