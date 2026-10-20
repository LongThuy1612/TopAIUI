<script setup lang="ts">
const { t } = useI18n()
const { user, load: loadAuth } = useAuth()
loadAuth()

const rankingMenuOpen = ref(false)
let closeTimer: ReturnType<typeof setTimeout> | null = null

function openRankingMenu() {
  if (closeTimer) { clearTimeout(closeTimer); closeTimer = null }
  rankingMenuOpen.value = true
}

function scheduleCloseRankingMenu() {
  closeTimer = setTimeout(() => { rankingMenuOpen.value = false }, 120)
}

const productsMenuOpen = ref(false)
let productsCloseTimer: ReturnType<typeof setTimeout> | null = null

function openProductsMenu() {
  if (productsCloseTimer) { clearTimeout(productsCloseTimer); productsCloseTimer = null }
  productsMenuOpen.value = true
}

function scheduleCloseProductsMenu() {
  productsCloseTimer = setTimeout(() => { productsMenuOpen.value = false }, 120)
}

const productItems = [
  {
    to: '/new',
    icon: 'M12 2.5a1 1 0 0 1 .95.69l1.35 4.16 4.16 1.35a1 1 0 0 1 0 1.9l-4.16 1.35-1.35 4.16a1 1 0 0 1-1.9 0l-1.35-4.16-4.16-1.35a1 1 0 0 1 0-1.9l4.16-1.35 1.35-4.16A1 1 0 0 1 12 2.5Zm7 12.5a.75.75 0 0 1 .71.51l.6 1.78 1.78.6a.75.75 0 0 1 0 1.42l-1.78.6-.6 1.78a.75.75 0 0 1-1.42 0l-.6-1.78-1.78-.6a.75.75 0 0 1 0-1.42l1.78-.6.6-1.78A.75.75 0 0 1 19 15Z',
    titleKey: 'productsMenu.newTitle',
    descKey: 'productsMenu.newDesc'
  },
  {
    // By saves (per account, Dashboard → Saved AIs), then rating.
    to: '/most-saved',
    icon: 'M12 2.5l2.94 5.96 6.58.96-4.76 4.64 1.12 6.55L12 17.52l-5.88 3.09 1.12-6.55L2.48 9.42l6.58-.96L12 2.5Z',
    titleKey: 'productsMenu.savedTitle',
    descKey: 'productsMenu.savedDesc'
  },
  {
    // Ranked by monthly website visits.
    to: '/ranking',
    icon: 'M3 17.25 8.25 12l3 3L21 6.75M21 6.75h-4.5M21 6.75v4.5',
    titleKey: 'productsMenu.usedTitle',
    descKey: 'productsMenu.usedDesc',
    stroke: true
  },
  {
    to: '/category/all',
    icon: 'M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z',
    titleKey: 'productsMenu.appsTitle',
    descKey: 'productsMenu.appsDesc'
  },
  {
    to: '/discord',
    icon: 'M18.9 6.4a15.6 15.6 0 0 0-3.86-1.2l-.2.37c1.32.32 2.06.79 2.8 1.29a10.7 10.7 0 0 0-9.28 0c.7-.53 1.6-1 2.8-1.3l-.2-.36c-1.36.24-2.66.65-3.86 1.2C4.5 9.6 3.6 12.7 3.9 15.75a15.7 15.7 0 0 0 4.79 2.42c.39-.53.73-1.1 1.02-1.7a10.2 10.2 0 0 1-1.6-.77c.14-.1.27-.2.4-.31 3.06 1.42 6.4 1.42 9.42 0 .13.11.26.21.4.31-.5.3-1.04.56-1.6.77.29.6.63 1.17 1.02 1.7a15.6 15.6 0 0 0 4.79-2.42c.36-3.53-.56-6.6-2.64-9.35ZM9.7 13.9c-.9 0-1.64-.83-1.64-1.85 0-1.02.72-1.85 1.64-1.85.93 0 1.66.85 1.65 1.85 0 1.02-.72 1.85-1.65 1.85Zm4.6 0c-.9 0-1.64-.83-1.64-1.85 0-1.02.72-1.85 1.64-1.85.93 0 1.66.85 1.65 1.85 0 1.02-.72 1.85-1.65 1.85Z',
    titleKey: 'productsMenu.discordTitle',
    descKey: 'productsMenu.discordDesc'
  },
  {
    to: '/category/chrome-extensions',
    icon: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 3.2A6.8 6.8 0 0 1 18.4 10H12V5.2Zm-1.2 0v6.15L6.1 16.7A6.79 6.79 0 0 1 10.8 5.2ZM12 18.8a6.78 6.78 0 0 1-4.98-2.17l5.63-5.63h6.75A6.8 6.8 0 0 1 12 18.8Z',
    titleKey: 'productsMenu.extensionsTitle',
    descKey: 'productsMenu.extensionsDesc'
  },
  {
    to: '/gpts',
    icon: 'M12 2 2 7l10 5 10-5-10-5Zm0 8.5L4 6.75V16l8 4 8-4V6.75L12 10.5Z',
    titleKey: 'productsMenu.gptsTitle',
    descKey: 'productsMenu.gptsDesc'
  },
  {
    to: '/category/llms',
    icon: 'M12 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 14a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm-9-7a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm18 0a3 3 0 1 1 0 6 3 3 0 0 1 0-6ZM6.5 8.5l3 2.5m4 0 3-2.5m-10 6 3-2.5m4 0 3 2.5',
    titleKey: 'productsMenu.modelsTitle',
    descKey: 'productsMenu.modelsDesc',
    stroke: true
  }
]

// Prompts and Resource menus are hidden for now; flip to bring them back.
const SHOW_PROMPTS_RESOURCE = false

const promptsMenuOpen = ref(false)
let promptsCloseTimer: ReturnType<typeof setTimeout> | null = null

function openPromptsMenu() {
  if (promptsCloseTimer) { clearTimeout(promptsCloseTimer); promptsCloseTimer = null }
  promptsMenuOpen.value = true
}

function scheduleClosePromptsMenu() {
  promptsCloseTimer = setTimeout(() => { promptsMenuOpen.value = false }, 120)
}

const promptItems = [
  {
    to: '#',
    icon: 'M5 12h4m6 0h4M9 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm10 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z',
    titleKey: 'promptsMenu.n8nTitle',
    stroke: true
  },
  {
    to: '#',
    icon: 'M17 3 7 21',
    titleKey: 'promptsMenu.midjourneyTitle',
    stroke: true
  },
  {
    to: '#',
    icon: 'M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959a.64.64 0 0 1-.657.643 48.39 48.39 0 0 1-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 0 1-.658.663c-.355 0-.676-.186-.959-.401a1.647 1.647 0 0 0-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401.31 0 .555.26.532.57a48.039 48.039 0 0 1-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 0 0 .657-.643c0-.355-.186-.676-.401-.959a1.647 1.647 0 0 1-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959 0 .333.277.599.61.58a48.1 48.1 0 0 0 5.427-.63 48.05 48.05 0 0 0 .582-4.717.532.532 0 0 0-.533-.57c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.96.401a.656.656 0 0 0 .658-.663 48.422 48.422 0 0 0-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 0 1-.61-.58Z',
    titleKey: 'promptsMenu.openclawTitle',
    stroke: true
  },
  {
    to: '#',
    icon: 'M9 4.5a.75.75 0 0 1 .721.544l.813 2.846a3.75 3.75 0 0 0 2.576 2.576l2.846.813a.75.75 0 0 1 0 1.442l-2.846.813a3.75 3.75 0 0 0-2.576 2.576l-.813 2.846a.75.75 0 0 1-1.442 0l-.813-2.846a3.75 3.75 0 0 0-2.576-2.576l-2.846-.813a.75.75 0 0 1 0-1.442l2.846-.813A3.75 3.75 0 0 0 7.71 7.89l.813-2.846A.75.75 0 0 1 9 4.5ZM18 1.5a.75.75 0 0 1 .728.568l.258 1.036c.146.584.605 1.043 1.189 1.189l1.036.258a.75.75 0 0 1 0 1.456l-1.036.258a1.5 1.5 0 0 0-1.189 1.189l-.258 1.036a.75.75 0 0 1-1.456 0l-.258-1.036a1.5 1.5 0 0 0-1.189-1.189l-1.036-.258a.75.75 0 0 1 0-1.456l1.036-.258a1.5 1.5 0 0 0 1.189-1.189l.258-1.036A.75.75 0 0 1 18 1.5Z',
    titleKey: 'promptsMenu.gptImageTitle'
  },
  {
    to: '#',
    icon: 'M18.375 2.25c-1.035 0-1.875.84-1.875 1.875v15.75c0 1.035.84 1.875 1.875 1.875h.75c1.035 0 1.875-.84 1.875-1.875V4.125c0-1.035-.84-1.875-1.875-1.875h-.75ZM9.75 8.625c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v11.25c0 1.035-.84 1.875-1.875 1.875h-.75a1.875 1.875 0 0 1-1.875-1.875V8.625ZM3 13.125c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v6.75c0 1.035-.84 1.875-1.875 1.875h-.75A1.875 1.875 0 0 1 3 19.875v-6.75Z',
    titleKey: 'promptsMenu.seedreamTitle'
  },
  {
    to: '#',
    icon: 'M18.375 2.25c-1.035 0-1.875.84-1.875 1.875v15.75c0 1.035.84 1.875 1.875 1.875h.75c1.035 0 1.875-.84 1.875-1.875V4.125c0-1.035-.84-1.875-1.875-1.875h-.75ZM9.75 8.625c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v11.25c0 1.035-.84 1.875-1.875 1.875h-.75a1.875 1.875 0 0 1-1.875-1.875V8.625ZM3 13.125c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v6.75c0 1.035-.84 1.875-1.875 1.875h-.75A1.875 1.875 0 0 1 3 19.875v-6.75Z',
    titleKey: 'promptsMenu.seedanceTitle'
  }
]

const resourceMenuOpen = ref(false)
let resourceCloseTimer: ReturnType<typeof setTimeout> | null = null

function openResourceMenu() {
  if (resourceCloseTimer) { clearTimeout(resourceCloseTimer); resourceCloseTimer = null }
  resourceMenuOpen.value = true
}

function scheduleCloseResourceMenu() {
  resourceCloseTimer = setTimeout(() => { resourceMenuOpen.value = false }, 120)
}

const resourceItems = [
  {
    to: '#',
    icon: 'M11 4a7 7 0 1 0 4.9 12.02l3.54 3.54 1.42-1.42-3.54-3.54A7 7 0 0 0 11 4Zm0 2a5 5 0 1 1 0 10 5 5 0 0 1 0-10Z',
    titleKey: 'resourceMenu.checkDomainTitle'
  },
  {
    to: '#',
    icon: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 3.2A6.8 6.8 0 0 1 18.4 10H12V5.2Zm-1.2 0v6.15L6.1 16.7A6.79 6.79 0 0 1 10.8 5.2ZM12 18.8a6.78 6.78 0 0 1-4.98-2.17l5.63-5.63h6.75A6.8 6.8 0 0 1 12 18.8Z',
    titleKey: 'resourceMenu.aiDomainTitle'
  }
]

const submitMenuOpen = ref(false)
let submitCloseTimer: ReturnType<typeof setTimeout> | null = null

function openSubmitMenu() {
  if (submitCloseTimer) { clearTimeout(submitCloseTimer); submitCloseTimer = null }
  submitMenuOpen.value = true
}

function scheduleCloseSubmitMenu() {
  submitCloseTimer = setTimeout(() => { submitMenuOpen.value = false }, 120)
}

const submitItems = [
  {
    to: '/submit',
    icon: 'M4.5 2A1.5 1.5 0 0 0 3 3.5v17A1.5 1.5 0 0 0 4.5 22h15a1.5 1.5 0 0 0 1.5-1.5V8.5L14.5 2h-10Zm9 1.5 5 5H15a1.5 1.5 0 0 1-1.5-1.5V3.5ZM6 13h12v1.5H6V13Zm0 3.5h12V18H6v-1.5ZM6 9.5h6V11H6V9.5Z',
    titleKey: 'submitMenu.submitTitle'
  },
  {
    to: '/update-ai',
    icon: 'M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99',
    titleKey: 'submitMenu.updateAiTitle',
    stroke: true
  },
  {
    to: '/post-or-insert',
    icon: 'M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757M10.81 15.312a4.5 4.5 0 0 1-1.242-7.244l4.5-4.5a4.5 4.5 0 0 1 6.364 6.364l-1.757 1.757',
    titleKey: 'submitMenu.guestPostsTitle',
    stroke: true
  }
]

// Top-level header links (Advertise, Submit GPT) when the nav has room for them;
// otherwise they move into the Submit menu (see navLevel below).
const submitLinks = [
  {
    to: '/advertise',
    icon: 'M11.99 2.01a.75.75 0 0 1 .53.22l3.72 3.72 3.44-1.15a.75.75 0 0 1 .99.71v13a.75.75 0 0 1-.99.71l-3.44-1.15-3.72 3.72a.75.75 0 0 1-1.28-.53V16.5H8a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3.25V2.76a.75.75 0 0 1 .74-.75Z',
    titleKey: 'submitMenu.advertiseTitle'
  },
  {
    to: '/submit-gpt',
    icon: 'M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z',
    titleKey: 'submitMenu.submitGptTitle',
    stroke: true
  }
]

const rankingItems = [
  {
    to: '/ranking',
    icon: 'M6 3.75A1.75 1.75 0 0 1 7.75 2h8.5A1.75 1.75 0 0 1 18 3.75v.5h.25A1.75 1.75 0 0 1 20 6v12.25A1.75 1.75 0 0 1 18.25 20H5.75A1.75 1.75 0 0 1 4 18.25V6a1.75 1.75 0 0 1 1.75-1.75H6v-.5ZM7.5 4.25v.5h5v-.5h-5ZM6 12h5v1.5H6V12Zm0 3.5h8V17H6v-1.5ZM6 8.5h8V10H6V8.5Z',
    titleKey: 'rankingMenu.monthlyTitle',
    descKey: 'rankingMenu.monthlyDesc'
  },
  {
    to: '/ranking/categories',
    icon: 'M11.42 2.13a1 1 0 0 1 1.16 0l8 5.7a1 1 0 0 1 0 1.63l-8 5.7a1 1 0 0 1-1.16 0l-8-5.7a1 1 0 0 1 0-1.63l8-5.7Zm-6.2 10.6 6.2 4.42a1 1 0 0 0 1.16 0l6.2-4.42 1.64 1.17a1 1 0 0 1 0 1.63l-8 5.7a1 1 0 0 1-1.16 0l-8-5.7a1 1 0 0 1 0-1.63l1.96-1.17Z',
    titleKey: 'rankingMenu.categoriesTitle',
    descKey: 'rankingMenu.categoriesDesc'
  },
  {
    to: '/ranking/regions',
    icon: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm6.93 6h-3.05a15.6 15.6 0 0 0-1.25-3.66A8.03 8.03 0 0 1 18.93 8ZM12 4.06c.7 1.06 1.27 2.35 1.63 3.94h-3.26c.36-1.59.93-2.88 1.63-3.94ZM4.26 14a8.14 8.14 0 0 1 0-4h3.5a16.7 16.7 0 0 0 0 4h-3.5Zm.81 2h3.05c.3 1.36.72 2.6 1.25 3.66A8.03 8.03 0 0 1 5.07 16Zm3.05-8H5.07a8.03 8.03 0 0 1 4.3-3.66A15.6 15.6 0 0 0 8.12 8ZM12 19.94c-.7-1.06-1.27-2.35-1.63-3.94h3.26c-.36 1.59-.93 2.88-1.63 3.94ZM13.87 14h-3.74a14.7 14.7 0 0 1 0-4h3.74a14.7 14.7 0 0 1 0 4Zm.4 5.66c.53-1.06.95-2.3 1.25-3.66h3.05a8.03 8.03 0 0 1-4.3 3.66ZM16.24 14a16.7 16.7 0 0 0 0-4h3.5a8.14 8.14 0 0 1 0 4h-3.5Z',
    titleKey: 'rankingMenu.regionsTitle',
    descKey: 'rankingMenu.regionsDesc'
  },
  {
    to: '/ranking/source',
    icon: 'M4 13h3v7H4v-7Zm6.5-5h3v12h-3V8Zm6.5 8h3v4h-3v-4Z',
    titleKey: 'rankingMenu.sourceTitle',
    descKey: 'rankingMenu.sourceDesc'
  }
]

// How much of the desktop nav fits, measured from the real (translated) text
// rather than fixed breakpoints, so the items close in on each other first and
// only collapse once they would touch:
//   full    — every item on the bar
//   merged  — Update AI / Submit GPT move into the Submit menu
//   compact — the bar is hidden and the burger menu takes over
// Until the first measurement (SSR + hydration) the breakpoint classes below
// stand in, so the server-rendered header already looks about right. They hide
// with visibility, never display:none, so the first measurement on mount sees
// real widths instead of zeros.
const navEl = ref<HTMLElement | null>(null)
const navInner = ref<HTMLElement | null>(null)
const submitLinksEl = ref<HTMLElement | null>(null)
const burgerEl = ref<HTMLElement | null>(null)
const navMeasured = ref(false)
const navLevel = ref<'full' | 'merged' | 'compact'>('full')

function measureNav() {
  const nav = navEl.value, inner = navInner.value, extra = submitLinksEl.value
  if (!nav || !inner || !extra) return
  // inner is w-max, so its box is the items' natural width. When the two extra
  // links are out of the flow (absolute), add them back to get the full width.
  const gap = parseFloat(getComputedStyle(inner).columnGap) || 0
  const extraWidth = extra.getBoundingClientRect().width + gap
  const innerWidth = inner.getBoundingClientRect().width
  const extraInFlow = getComputedStyle(extra).position !== 'absolute'
  const fullWidth = extraInFlow ? innerWidth : innerWidth + extraWidth
  // While the burger shows it takes room from the nav that the nav gets back
  // once the burger hides; count it so growing and shrinking switch at the
  // same window width.
  let room = nav.clientWidth - 4
  const burger = burgerEl.value
  if (burger && getComputedStyle(burger).display !== 'none') {
    const burgerStyle = getComputedStyle(burger)
    room += burger.offsetWidth + parseFloat(burgerStyle.marginLeft) + parseFloat(burgerStyle.marginRight)
      + (parseFloat(getComputedStyle(burger.parentElement!).columnGap) || 0)
  }
  navLevel.value = fullWidth <= room ? 'full' : fullWidth - extraWidth <= room ? 'merged' : 'compact'
  navMeasured.value = true
}

// ResizeObserver callbacks that change layout can trigger "ResizeObserver loop"
// errors; measure on the next frame instead, once per frame.
let measureFrame = 0
function scheduleMeasureNav() {
  if (measureFrame) return
  measureFrame = requestAnimationFrame(() => { measureFrame = 0; measureNav() })
}

const navClass = computed(() => {
  if (!navMeasured.value) return 'flex max-xl:invisible max-xl:overflow-hidden'
  return navLevel.value === 'compact' ? 'flex invisible overflow-hidden' : 'flex'
})
const submitLinksClass = computed(() => {
  // Parked at the nav's start (left-0) so the hidden copy can't stick out past
  // the header's right edge.
  if (!navMeasured.value) return 'flex max-[1759px]:invisible max-[1759px]:absolute max-[1759px]:left-0 max-[1759px]:top-0'
  return navLevel.value === 'full' ? 'flex' : 'invisible absolute left-0 top-0 flex'
})
const showMergedLinks = computed(() => !navMeasured.value || navLevel.value !== 'full')
const burgerClass = computed(() => {
  if (!navMeasured.value) return 'flex xl:hidden'
  return navLevel.value === 'compact' ? 'flex' : 'hidden'
})

let navObserver: ResizeObserver | null = null

// Mobile menu (shown when navLevel is compact): a panel with the same links;
// each dropdown becomes a collapsible section.
const mobileMenuOpen = ref(false)
const mobileSection = ref<'products' | 'ranking' | 'submit' | null>(null)
const route = useRoute()

function toggleMobileSection(section: 'products' | 'ranking' | 'submit') {
  mobileSection.value = mobileSection.value === section ? null : section
}

const mobilePanelEl = ref<HTMLElement | null>(null)
const mobileCloseEl = ref<HTMLElement | null>(null)

// Closing with Escape / the close button / the backdrop hands keyboard focus
// back to the burger; closing because of a navigation leaves focus alone.
function closeMobileMenu(restoreFocus = true) {
  if (!mobileMenuOpen.value) return
  mobileMenuOpen.value = false
  if (restoreFocus) nextTick(() => burgerEl.value?.focus())
}

// On a tool's page (it starts with the light orange band) the header takes the same
// colour and loses its line, fading to the usual white as the page scrolls.
const tintedPage = computed(() => String(route.name ?? '').split('___')[0] === 'tools-slug')
// 0 at the top → 1 after 160px: the colour and the line fade with the scroll, not at once.
const scrollFade = ref(0)
let scrollFrame = 0
function onScroll() {
  if (scrollFrame) return
  scrollFrame = requestAnimationFrame(() => {
    scrollFrame = 0
    scrollFade.value = Math.min(1, Math.max(0, window.scrollY / 160))
  })
}
// #FFF3F0 → white, and the bottom line (ink-100 #EFEFF2) fading in.
const headerStyle = computed(() => {
  if (!tintedPage.value) return undefined
  const f = scrollFade.value
  const mix = (a: number) => Math.round(a + (255 - a) * f)
  return {
    backgroundColor: `rgba(255, ${mix(243)}, ${mix(240)}, ${1 - 0.08 * f})`,
    borderBottomColor: `rgba(239, 239, 242, ${f})`
  }
})

// Close on navigation — also covers links that point at the current page.
watch(() => route.fullPath, () => closeMobileMenu(false))

// The page behind the panel shouldn't scroll while it is open.
watch(mobileMenuOpen, (open) => {
  if (!import.meta.client) return
  document.documentElement.style.overflow = open ? 'hidden' : ''
  if (open) nextTick(() => mobileCloseEl.value?.focus())
  else mobileSection.value = null
})

function onKeydown(e: KeyboardEvent) {
  if (!mobileMenuOpen.value) return
  if (e.key === 'Escape') { closeMobileMenu(); return }
  // Keep Tab inside the panel; the page behind it is covered.
  if (e.key === 'Tab' && mobilePanelEl.value) {
    const focusables = [...mobilePanelEl.value.querySelectorAll<HTMLElement>('a[href], button, select')]
      .filter(el => el.offsetParent)
    if (!focusables.length) return
    const first = focusables[0]!, last = focusables[focusables.length - 1]!
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
  }
}

// Widening the window until the desktop nav fits again closes the panel; going
// the other way closes any hover dropdown, so it isn't still open when the bar
// comes back.
watch(navLevel, (level) => {
  if (level !== 'compact') closeMobileMenu(false)
  else productsMenuOpen.value = rankingMenuOpen.value = submitMenuOpen.value = false
})

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()
  measureNav()
  // nav: window / logo size changes. inner: language switch, web fonts loading.
  navObserver = new ResizeObserver(scheduleMeasureNav)
  if (navEl.value) navObserver.observe(navEl.value)
  if (navInner.value) navObserver.observe(navInner.value)
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  cancelAnimationFrame(scrollFrame)
  window.removeEventListener('keydown', onKeydown)
  navObserver?.disconnect()
  cancelAnimationFrame(measureFrame)
  document.documentElement.style.overflow = ''
})
</script>

<template>
  <header :class="['sticky top-0 z-40 border-b backdrop-blur-md', !headerStyle && 'border-ink-100 bg-white/[.92]']" :style="headerStyle">
    <div class="flex h-[64px] items-center gap-5 px-4 sm:px-6 lg:px-10">
      <NuxtLinkLocale to="/" class="flex shrink-0 items-center gap-2.5">
        <IconLogo class="h-8 w-8" width="32" height="32" />
        <span class="whitespace-nowrap text-[17px] font-bold text-ink-900">TopAICollection</span>
      </NuxtLinkLocale>

      <nav ref="navEl" class="min-w-0 flex-1 items-center justify-start pl-1" :class="navClass">
        <!-- Gaps shrink with the window, so items close in before the nav collapses. -->
        <div ref="navInner" class="relative flex w-max shrink-0 items-center gap-[clamp(0px,0.9vw,12px)]">
          <NuxtLinkLocale to="/category/all?pricing=FREE" class="whitespace-nowrap rounded-lg px-2 py-2 text-sm font-medium text-ink-800 hover:text-ink-900">
            {{ t('header.freeTools') }}
          </NuxtLinkLocale>
          <div class="relative" @mouseenter="openProductsMenu" @mouseleave="scheduleCloseProductsMenu">
            <a
              href="#"
              class="flex items-center gap-1 whitespace-nowrap rounded-lg px-2 py-2 text-sm font-medium text-ink-800 hover:text-ink-900"
              :class="productsMenuOpen && 'text-ink-900'"
              @click.prevent
            >
              {{ t('header.products') }}
              <svg class="h-3.5 w-3.5 transition-transform" :class="productsMenuOpen && 'rotate-180'" fill="none" viewBox="0 0 20 20" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="m5 7.5 5 5 5-5" />
              </svg>
            </a>

            <div
              v-if="productsMenuOpen"
              class="menu-in absolute left-0 top-full w-[360px] rounded-2xl border border-ink-100 bg-white p-2 shadow-[0_16px_40px_-16px_rgba(23,18,26,.25)]"
            >
              <NuxtLinkLocale
                v-for="item in productItems"
                :key="item.titleKey"
                :to="item.to"
                class="flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-ink-100/60"
                @click="productsMenuOpen = false"
              >
                <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-500">
                  <svg v-if="item.stroke" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                    <path stroke-linecap="round" stroke-linejoin="round" :d="item.icon" />
                  </svg>
                  <svg v-else class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path :d="item.icon" /></svg>
                </span>
                <span class="min-w-0">
                  <span class="block text-sm font-bold text-ink-900">{{ t(item.titleKey) }}</span>
                  <span class="mt-0.5 block text-xs leading-snug text-ink-500">{{ t(item.descKey) }}</span>
                </span>
              </NuxtLinkLocale>
            </div>
          </div>
          <NuxtLinkLocale to="/categories" class="whitespace-nowrap rounded-lg px-2 py-2 text-sm font-medium text-ink-800 hover:text-ink-900">
            {{ t('header.categories') }}
          </NuxtLinkLocale>

          <div class="relative" @mouseenter="openRankingMenu" @mouseleave="scheduleCloseRankingMenu">
            <NuxtLinkLocale
              to="/ranking"
              class="flex items-center gap-1 whitespace-nowrap rounded-lg px-2 py-2 text-sm font-medium text-ink-800 hover:text-ink-900"
              :class="rankingMenuOpen && 'text-ink-900'"
            >
              {{ t('header.rankings') }}
              <svg class="h-3.5 w-3.5 transition-transform" :class="rankingMenuOpen && 'rotate-180'" fill="none" viewBox="0 0 20 20" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="m5 7.5 5 5 5-5" />
              </svg>
            </NuxtLinkLocale>

            <div
              v-if="rankingMenuOpen"
              class="menu-in absolute left-0 top-full w-[360px] rounded-2xl border border-ink-100 bg-white p-2 shadow-[0_16px_40px_-16px_rgba(23,18,26,.25)]"
            >
              <NuxtLinkLocale
                v-for="item in rankingItems"
                :key="item.to"
                :to="item.to"
                class="flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-ink-100/60"
                @click="rankingMenuOpen = false"
              >
                <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-500">
                  <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path :d="item.icon" /></svg>
                </span>
                <span class="min-w-0">
                  <span class="block text-sm font-bold text-ink-900">{{ t(item.titleKey) }}</span>
                  <span class="mt-0.5 block text-xs leading-snug text-ink-500">{{ t(item.descKey) }}</span>
                </span>
              </NuxtLinkLocale>
            </div>
          </div>

          <div v-if="SHOW_PROMPTS_RESOURCE" class="relative" @mouseenter="openPromptsMenu" @mouseleave="scheduleClosePromptsMenu">
            <a
              href="#"
              class="flex items-center gap-1 whitespace-nowrap rounded-lg px-2 py-2 text-sm font-medium text-ink-800 hover:text-ink-900"
              :class="promptsMenuOpen && 'text-ink-900'"
              @click.prevent
            >
              {{ t('header.prompts') }}
              <svg class="h-3.5 w-3.5 transition-transform" :class="promptsMenuOpen && 'rotate-180'" fill="none" viewBox="0 0 20 20" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="m5 7.5 5 5 5-5" />
              </svg>
            </a>

            <div
              v-if="promptsMenuOpen"
              class="menu-in absolute left-0 top-full w-[260px] rounded-2xl border border-ink-100 bg-white p-2 shadow-[0_16px_40px_-16px_rgba(23,18,26,.25)]"
            >
              <NuxtLinkLocale
                v-for="item in promptItems"
                :key="item.titleKey"
                :to="item.to"
                class="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-ink-100/60"
                @click="promptsMenuOpen = false"
              >
                <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-500">
                  <svg v-if="item.stroke" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                    <path stroke-linecap="round" stroke-linejoin="round" :d="item.icon" />
                  </svg>
                  <svg v-else class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path :d="item.icon" /></svg>
                </span>
                <span class="text-sm font-bold text-ink-900">{{ t(item.titleKey) }}</span>
              </NuxtLinkLocale>
            </div>
          </div>
          <div v-if="SHOW_PROMPTS_RESOURCE" class="relative" @mouseenter="openResourceMenu" @mouseleave="scheduleCloseResourceMenu">
            <a
              href="#"
              class="flex items-center gap-1 whitespace-nowrap rounded-lg px-2 py-2 text-sm font-medium text-ink-800 hover:text-ink-900"
              :class="resourceMenuOpen && 'text-ink-900'"
              @click.prevent
            >
              {{ t('header.resource') }}
              <svg class="h-3.5 w-3.5 transition-transform" :class="resourceMenuOpen && 'rotate-180'" fill="none" viewBox="0 0 20 20" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="m5 7.5 5 5 5-5" />
              </svg>
            </a>

            <div
              v-if="resourceMenuOpen"
              class="menu-in absolute left-0 top-full w-[240px] rounded-2xl border border-ink-100 bg-white p-2 shadow-[0_16px_40px_-16px_rgba(23,18,26,.25)]"
            >
              <NuxtLinkLocale
                v-for="item in resourceItems"
                :key="item.titleKey"
                :to="item.to"
                class="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-ink-100/60"
                @click="resourceMenuOpen = false"
              >
                <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-500">
                  <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path :d="item.icon" /></svg>
                </span>
                <span class="text-sm font-bold text-ink-900">{{ t(item.titleKey) }}</span>
              </NuxtLinkLocale>
            </div>
          </div>
          <div ref="submitLinksEl" class="items-center gap-[clamp(0px,0.9vw,12px)]" :class="submitLinksClass">
            <NuxtLinkLocale
              v-for="item in submitLinks"
              :key="item.to"
              :to="item.to"
              class="whitespace-nowrap rounded-lg px-2 py-2 text-sm font-medium text-ink-800 hover:text-ink-900"
            >
              {{ t(item.titleKey) }}
            </NuxtLinkLocale>
          </div>
        </div>
      </nav>

      <nav class="ml-auto flex shrink-0 items-center gap-3">
        <LanguageSwitcher class="hidden sm:block" />
        <!-- Submit: an outline pill with the submit / advertise / guest post menu. -->
          <div class="relative hidden sm:block" @mouseenter="openSubmitMenu" @mouseleave="scheduleCloseSubmitMenu">
            <NuxtLinkLocale
              to="/submit"
              class="flex items-center whitespace-nowrap rounded-full border border-ink-200 bg-white px-4 py-[9px] text-sm font-semibold text-ink-900 transition-colors hover:border-ink-400"
              :class="submitMenuOpen && 'border-ink-400'"
            >
              {{ t('header.submit') }}
            </NuxtLinkLocale>

            <div
              v-if="submitMenuOpen"
              class="menu-in absolute right-0 top-full z-10 w-[260px] rounded-2xl border border-ink-100 bg-white p-2 shadow-[0_16px_40px_-16px_rgba(23,18,26,.25)]"
            >
              <NuxtLinkLocale
                v-for="item in submitItems"
                :key="item.titleKey"
                :to="item.to"
                class="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-ink-100/60"
                @click="submitMenuOpen = false"
              >
                <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-500">
                  <svg v-if="item.stroke" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                    <path stroke-linecap="round" stroke-linejoin="round" :d="item.icon" />
                  </svg>
                  <svg v-else class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path :d="item.icon" /></svg>
                </span>
                <span class="text-sm font-bold text-ink-900">{{ t(item.titleKey) }}</span>
              </NuxtLinkLocale>
              <NuxtLinkLocale
                v-for="item in submitLinks"
                :key="item.to"
                :to="item.to"
                v-if="showMergedLinks"
                class="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-ink-100/60"
                :class="!navMeasured && 'min-[1760px]:hidden'"
                @click="submitMenuOpen = false"
              >
                <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-500">
                  <svg v-if="item.stroke" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                    <path stroke-linecap="round" stroke-linejoin="round" :d="item.icon" />
                  </svg>
                  <svg v-else class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path :d="item.icon" /></svg>
                </span>
                <span class="text-sm font-bold text-ink-900">{{ t(item.titleKey) }}</span>
              </NuxtLinkLocale>
            </div>
          </div>
        <NuxtLinkLocale
          :to="user ? '/dashboard' : '/login'"
          class="hidden whitespace-nowrap rounded-full bg-ink-900 px-[18px] py-2.5 text-sm font-semibold text-white hover:bg-black sm:block"
        >
          {{ t('header.admin') }}
        </NuxtLinkLocale>
        <button
          type="button"
          ref="burgerEl"
          class="-mr-2 h-10 w-10 items-center justify-center rounded-lg text-ink-800 hover:bg-ink-100/60"
          :class="burgerClass"
          :aria-label="t('header.openMenu')"
          aria-controls="mobile-menu"
          :aria-expanded="mobileMenuOpen"
          @click="mobileMenuOpen = true"
        >
          <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" d="M4 7h16M4 12h16M4 17h16" /></svg>
        </button>
      </nav>
    </div>

    <!-- Teleported: the header's backdrop-blur would otherwise make it the
         containing block for this fixed panel. -->
    <Teleport to="body">
      <div v-if="mobileMenuOpen" class="fixed inset-0 z-50 bg-ink-900/40" @click="closeMobileMenu()" />
      <div
        v-if="mobileMenuOpen"
        id="mobile-menu"
        ref="mobilePanelEl"
        class="fixed inset-x-0 top-0 z-50 flex max-h-screen flex-col supports-[height:100dvh]:max-h-[100dvh] rounded-b-2xl bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
        :aria-label="t('header.menu')"
      >
        <!-- Mirrors the header bar: from sm up the language switcher and
             Dashboard live up here, below sm in the footer row instead. -->
        <div class="flex h-[64px] shrink-0 items-center gap-3 border-b border-ink-100 px-4 sm:gap-4 sm:px-6 lg:px-10">
          <NuxtLinkLocale to="/" class="mr-auto flex items-center gap-2.5" @click="closeMobileMenu(false)">
            <IconLogo class="h-8 w-8" width="32" height="32" />
            <span class="whitespace-nowrap text-[17px] font-bold text-ink-900">TopAICollection</span>
          </NuxtLinkLocale>
          <LanguageSwitcher class="hidden sm:block" />
          <NuxtLinkLocale
            :to="user ? '/dashboard' : '/login'"
            class="hidden whitespace-nowrap rounded-full bg-ink-900 px-[18px] py-2.5 text-sm font-semibold text-white hover:bg-black sm:block"
            @click="closeMobileMenu(false)"
          >
            {{ t('header.admin') }}
          </NuxtLinkLocale>
          <button
            ref="mobileCloseEl"
            type="button"
            class="-mr-2 flex h-10 w-10 items-center justify-center rounded-lg text-ink-800 hover:bg-ink-100/60"
            :aria-label="t('header.closeMenu')"
            @click="closeMobileMenu()"
          >
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>

        <nav class="min-h-0 overflow-y-auto overscroll-contain px-4 py-3 sm:px-6 lg:px-8">
          <NuxtLinkLocale to="/category/all?pricing=FREE" class="block rounded-lg px-3 py-3 text-base font-semibold text-ink-900 hover:bg-ink-100/60" @click="closeMobileMenu(false)">
            {{ t('header.freeTools') }}
          </NuxtLinkLocale>

          <button
            type="button"
            class="flex w-full items-center justify-between rounded-lg px-3 py-3 text-base font-semibold text-ink-900 hover:bg-ink-100/60"
            :aria-expanded="mobileSection === 'products'"
            @click="toggleMobileSection('products')"
          >
            {{ t('header.products') }}
            <svg class="h-4 w-4 transition-transform" :class="mobileSection === 'products' && 'rotate-180'" fill="none" viewBox="0 0 20 20" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m5 7.5 5 5 5-5" /></svg>
          </button>
          <div v-if="mobileSection === 'products'" class="pb-2 pl-3">
            <NuxtLinkLocale
              v-for="item in productItems"
              :key="item.titleKey"
              :to="item.to"
              class="flex items-center gap-3 rounded-xl p-2.5 hover:bg-ink-100/60"
              @click="closeMobileMenu(false)"
            >
              <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-500">
                <svg v-if="item.stroke" class="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75"><path stroke-linecap="round" stroke-linejoin="round" :d="item.icon" /></svg>
                <svg v-else class="h-[18px] w-[18px]" fill="currentColor" viewBox="0 0 24 24"><path :d="item.icon" /></svg>
              </span>
              <span class="text-sm font-semibold text-ink-800">{{ t(item.titleKey) }}</span>
            </NuxtLinkLocale>
          </div>

          <NuxtLinkLocale to="/categories" class="block rounded-lg px-3 py-3 text-base font-semibold text-ink-900 hover:bg-ink-100/60" @click="closeMobileMenu(false)">
            {{ t('header.categories') }}
          </NuxtLinkLocale>

          <button
            type="button"
            class="flex w-full items-center justify-between rounded-lg px-3 py-3 text-base font-semibold text-ink-900 hover:bg-ink-100/60"
            :aria-expanded="mobileSection === 'ranking'"
            @click="toggleMobileSection('ranking')"
          >
            {{ t('header.rankings') }}
            <svg class="h-4 w-4 transition-transform" :class="mobileSection === 'ranking' && 'rotate-180'" fill="none" viewBox="0 0 20 20" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m5 7.5 5 5 5-5" /></svg>
          </button>
          <div v-if="mobileSection === 'ranking'" class="pb-2 pl-3">
            <NuxtLinkLocale
              v-for="item in rankingItems"
              :key="item.to"
              :to="item.to"
              class="flex items-center gap-3 rounded-xl p-2.5 hover:bg-ink-100/60"
              @click="closeMobileMenu(false)"
            >
              <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-500">
                <svg class="h-[18px] w-[18px]" fill="currentColor" viewBox="0 0 24 24"><path :d="item.icon" /></svg>
              </span>
              <span class="text-sm font-semibold text-ink-800">{{ t(item.titleKey) }}</span>
            </NuxtLinkLocale>
          </div>

          <button
            type="button"
            class="flex w-full items-center justify-between rounded-lg px-3 py-3 text-base font-semibold text-ink-900 hover:bg-ink-100/60"
            :aria-expanded="mobileSection === 'submit'"
            @click="toggleMobileSection('submit')"
          >
            {{ t('header.submit') }}
            <svg class="h-4 w-4 transition-transform" :class="mobileSection === 'submit' && 'rotate-180'" fill="none" viewBox="0 0 20 20" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m5 7.5 5 5 5-5" /></svg>
          </button>
          <div v-if="mobileSection === 'submit'" class="pb-2 pl-3">
            <NuxtLinkLocale
              v-for="item in [...submitItems, ...submitLinks]"
              :key="item.to"
              :to="item.to"
              class="flex items-center gap-3 rounded-xl p-2.5 hover:bg-ink-100/60"
              @click="closeMobileMenu(false)"
            >
              <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-500">
                <svg v-if="item.stroke" class="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75"><path stroke-linecap="round" stroke-linejoin="round" :d="item.icon" /></svg>
                <svg v-else class="h-[18px] w-[18px]" fill="currentColor" viewBox="0 0 24 24"><path :d="item.icon" /></svg>
              </span>
              <span class="text-sm font-semibold text-ink-800">{{ t(item.titleKey) }}</span>
            </NuxtLinkLocale>
          </div>
        </nav>

        <div class="flex shrink-0 items-center gap-3 border-t border-ink-200 px-4 py-4 sm:hidden">
          <LanguageSwitcher align-left />
          <NuxtLinkLocale
            :to="user ? '/dashboard' : '/login'"
            class="ml-auto whitespace-nowrap rounded-full bg-ink-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-black"
            @click="closeMobileMenu(false)"
          >
            {{ t('header.admin') }}
          </NuxtLinkLocale>
        </div>
      </div>
    </Teleport>
  </header>
</template>
