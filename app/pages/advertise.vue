<script setup lang="ts">
import { advertise, AD_TIERS, type AdTier } from '~/data/promote'
import { isHttpUrl, type ToolOption, type PaymentProvider } from '~/composables/usePromoteCheckout'

const { t, tp, list, faqs } = usePromoteText()
const { tm } = useI18n()

useSeoMeta({
  title: () => tp('promote.advertise.seoTitle'),
  description: () => tp('promote.advertise.seoDesc'),
})

const route = useRoute()
const tool = ref<ToolOption | null>(null)
const landingUrl = ref('')
// ?tier=FEATURED preselects the tier (top-up links from the dashboard).
const tier = ref<AdTier>(AD_TIERS.find(x => x === route.query.tier) ?? 'STANDARD')
const selected = ref<number | null>(null)
const touched = ref(false)

const packages = computed(() => advertise.packages[tier.value])
const pkg = computed(() => (selected.value == null ? null : packages.value[selected.value]))
const total = computed(() => (pkg.value ? +(pkg.value.clicks * pkg.value.costPerClick).toFixed(2) : null))

const errors = computed(() => ({
  tool: tool.value ? '' : t('promote.form.selectTool'),
  landing: !landingUrl.value.trim() || isHttpUrl(landingUrl.value) ? '' : t('promote.form.invalidUrl'),
}))

// Mỗi loại quảng cáo: badge, tiêu đề và danh sách ý (promote.advertise.types)
const adTypes = computed(() =>
  (tm('promote.advertise.types') as unknown as unknown[]).map((_, i) => ({
    badge: t(`promote.advertise.types.${i}.badge`),
    title: t(`promote.advertise.types.${i}.title`),
    points: list(`promote.advertise.types.${i}.points`),
    featured: i === advertise.featuredTypeIndex,
  })),
)

const { checkout, loading, error } = usePromoteCheckout()
useStripeReturn()
function pay(provider: PaymentProvider) {
  touched.value = true
  if (errors.value.tool || errors.value.landing || !pkg.value) return
  checkout({ type: 'advertise', toolId: tool.value!.id, tier: tier.value, landingUrl: landingUrl.value.trim() || undefined, clicks: pkg.value.clicks }, provider)
}
const nf = new Intl.NumberFormat('en-US')
</script>

<template>
  <PromoteShell active="advertise" :faq-title="t('promote.advertise.faqTitle')" :faqs="faqs('promote.advertise.faqs')">
    <section class="p-panel">
      <h2 class="p-panel__title">{{ t('promote.advertise.panelTitle') }}</h2>

      <div class="p-field">
        <div class="p-label">
          <span><span class="req">*</span>{{ t('promote.form.tool') }}</span>
          <i18n-t keypath="promote.toolPicker.notListed" tag="small">
            <template #link><NuxtLinkLocale to="/submit">{{ t('promote.toolPicker.submitFirst') }}</NuxtLinkLocale></template>
          </i18n-t>
        </div>
        <PromoteToolPicker v-model="tool" :error="touched ? errors.tool : ''" />
      </div>

      <div class="p-field">
        <label class="p-label" for="landing">{{ t('promote.advertise.landing') }} <small>{{ t('promote.advertise.landingHint') }}</small></label>
        <input id="landing" v-model="landingUrl" class="p-input" :class="{ 'p-input--error': errors.landing }" placeholder="https://example.ai/?utm_source=topaicollection">
        <p v-if="errors.landing" class="p-error">{{ errors.landing }}</p>
      </div>

      <h3 class="sub">{{ t('promote.advertise.chooseTier') }}</h3>
      <div class="tiers" role="radiogroup">
        <button
          v-for="(x, i) in AD_TIERS"
          :key="x"
          type="button"
          role="radio"
          :aria-checked="tier === x"
          class="tier"
          :class="{ 'tier--on': tier === x }"
          @click="tier = x"
        >
          <strong>{{ adTypes[i]?.title }}</strong>
          <small>{{ t(`promote.advertise.tierHints.${x}`) }}</small>
        </button>
      </div>
      <p class="muted review-note">{{ t('promote.advertise.reviewNote') }}</p>

      <h3 class="sub">{{ t('promote.advertise.choosePackage') }}</h3>
      <div class="clicks" role="radiogroup">
        <button
          v-for="(p, i) in packages"
          :key="p.clicks"
          type="button"
          role="radio"
          :aria-checked="selected === i"
          class="click"
          :class="{ 'click--on': selected === i }"
          @click="selected = i"
        >
          <span>{{ t('promote.advertise.clicksLabel') }}</span><strong>{{ nf.format(p.clicks) }}</strong>
        </button>
      </div>
      <p v-if="touched && selected == null" class="p-error">{{ t('promote.advertise.pickPackage') }}</p>

      <PromotePayBar :total="total" :loading="loading" @pay="pay">
        <template #before>
          <p class="meta">{{ t('promote.advertise.clicksLabel') }} <b>{{ pkg ? nf.format(pkg.clicks) : '--' }}</b></p>
        </template>
        <template #after>
          <p class="meta">{{ t('promote.advertise.cpc', { amount: pkg ? `$ ${pkg.costPerClick.toFixed(2)}` : '$ --' }) }}</p>
        </template>
      </PromotePayBar>
      <p v-if="error" class="p-error">{{ error }}</p>
    </section>

    <section class="p-panel how">
      <h2 class="p-panel__title">{{ t('promote.advertise.howTitle') }}</h2>
      <div class="how__intro">
        <p>{{ list('promote.advertise.intro')[0] }} <span class="warn">({{ t('promote.advertise.warning') }})</span></p>
        <p>{{ list('promote.advertise.intro')[1] }}</p>
        <p class="muted">{{ t('promote.advertise.controlNote') }}</p>
      </div>

      <h3 class="sub">{{ t('promote.advertise.placementsTitle') }}</h3>
      <div class="types">
        <div v-for="ad in adTypes" :key="ad.title" class="type" :class="{ 'type--featured': ad.featured }">
          <span class="badge">{{ ad.badge }}</span>
          <div class="mock-card"><span class="mock-logo">E</span><div><b>Example AI</b><small>{{ t('promote.advertise.tagline') }}</small></div></div>
          <h4>{{ ad.title }}</h4>
          <ul>
            <li v-for="pt in ad.points" :key="pt">{{ pt }}</li>
          </ul>
        </div>
      </div>

      <h3 class="sub">{{ t('promote.advertise.reportTitle') }}</h3>
      <p class="muted center">{{ t('promote.advertise.reportNote') }}</p>
      <div class="table-wrap">
        <table>
          <thead><tr><th v-for="c in list('promote.advertise.reportColumns')" :key="c">{{ c }}</th></tr></thead>
          <tbody>
            <tr v-for="(r, i) in advertise.reportExampleRows" :key="i"><td v-for="(v, j) in r" :key="j">{{ v }}</td></tr>
          </tbody>
        </table>
      </div>
      <p class="muted center small">{{ t('promote.advertise.sampleNote') }}</p>
    </section>
  </PromoteShell>
</template>

<style scoped>
.sub { text-align: center; font-size: 20px; margin: 32px 0 16px; }
.tiers { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.tier {
  display: flex; flex-direction: column; gap: 4px; padding: 14px; text-align: left;
  border: 1px solid #d9d9de; border-radius: 6px; background: #fff; font: inherit; cursor: pointer; color: var(--p-text);
}
.tier small { color: var(--p-muted); font-size: 13px; }
.tier--on { border-color: var(--p-primary); box-shadow: 0 0 0 1px var(--p-primary); }
.review-note { margin: 10px 0 0; }
.clicks { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.click {
  display: flex; justify-content: space-between; align-items: center; height: 60px; padding: 0 14px;
  border: 1px solid #d9d9de; border-radius: 6px; background: #fff; font: inherit; font-size: 14px; cursor: pointer; color: var(--p-text);
}
.click strong { font-size: 16px; }
.click--on { border-color: var(--p-primary); background: var(--p-primary); color: #fff; }
.meta { margin: 0 0 6px; font-size: 14px; color: var(--p-muted); }
.meta b { color: var(--p-text); }

.how__intro { max-width: 820px; margin: 0 auto; line-height: 1.6; }
.how__intro p { margin: 0 0 10px; }
.warn { color: var(--p-danger); }
.muted { color: var(--p-muted); font-size: 14px; }
.center { text-align: center; }
.small { font-size: 12px; }

.types { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
.type { background: #f6f7f9; border-radius: 14px; padding: 20px 24px; text-align: center; }
.type--featured { background: #e6e4ff; }
.badge { display: inline-block; padding: 4px 10px; border: 1px solid #ccc; background: #fff; border-radius: 3px; font-size: 14px; }
.type--featured .badge { background: var(--p-primary); border-color: var(--p-primary); color: #fff; }
.mock-card {
  display: flex; gap: 10px; align-items: center; text-align: left; margin: 18px auto; max-width: 280px;
  background: #fff; border-radius: 8px; padding: 14px; box-shadow: 0 1px 6px rgba(0, 0, 0, .05);
}
.type--featured .mock-card { border: 2px solid #a594f0; }
.mock-card small { display: block; color: var(--p-muted); font-size: 12px; }
.mock-logo { flex: none; width: 26px; height: 26px; border-radius: 6px; background: var(--p-primary); color: #fff; display: grid; place-items: center; }
.type h4 { margin: 0 0 10px; }
.type ul { text-align: left; margin: 0; padding-left: 18px; font-size: 14px; line-height: 1.6; }

.table-wrap { overflow-x: auto; margin-top: 12px; }
table { width: 100%; border-collapse: collapse; font-size: 14px; }
th, td { border: 1px solid var(--p-border); padding: 10px; text-align: center; white-space: nowrap; }
th { background: #f6f7f9; }

@media (max-width: 700px) {
  .clicks { grid-template-columns: repeat(2, 1fr); }
  .tiers { grid-template-columns: 1fr; }
  .types { grid-template-columns: 1fr; }
}
</style>
