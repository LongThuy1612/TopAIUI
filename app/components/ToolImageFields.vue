<script setup lang="ts">
// Logo + screenshot uploader shared by the owner's tool page and the admin
// ToolForm. Each file is uploaded right away to `uploadUrl` (which returns
// { url }); the URLs only reach the tool when the surrounding form is saved.
const props = withDefaults(defineProps<{
  uploadUrl: string
  name?: string
  logoRequired?: boolean
  maxImages?: number
  // Narrow column: fewer screenshots per row.
  compact?: boolean
}>(), { name: '', logoRequired: false, maxImages: 6, compact: false })

const logo = defineModel<string>('logo', { required: true })
const images = defineModel<string[]>('images', { required: true })
// True while a file is uploading, so the parent can hold off saving.
const busy = defineModel<boolean>('busy', { default: false })

const { t } = useI18n()
const { authHeaders } = useAuth()

const MAX_BYTES = 5 * 1024 * 1024
const ACCEPT = 'image/png,image/jpeg,image/webp,image/gif'
const uploading = ref<'logo' | 'images' | null>(null)
const error = ref('')

watch(uploading, v => { busy.value = !!v })

async function uploadFile(file: File) {
  if (file.size > MAX_BYTES) throw new Error(t('myTool.upload.tooLarge'))
  const body = new FormData()
  body.append('file', file)
  const res = await $fetch<{ url: string }>(props.uploadUrl, { method: 'POST', headers: authHeaders(), body })
  return res.url
}

async function onPick(e: Event, target: 'logo' | 'images') {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = ''
  if (!files.length) return
  error.value = ''
  uploading.value = target
  try {
    if (target === 'logo') {
      logo.value = await uploadFile(files[0]!)
    } else {
      for (const file of files.slice(0, props.maxImages - images.value.length)) {
        images.value = [...images.value, await uploadFile(file)]
      }
    }
  } catch (err: any) {
    error.value = err?.data?.message || err?.message || t('myTool.upload.error')
  } finally {
    uploading.value = null
  }
}

function move(i: number, dir: -1 | 1) {
  const j = i + dir
  if (j < 0 || j >= images.value.length) return
  const next = [...images.value]
  const [img] = next.splice(i, 1)
  next.splice(j, 0, img!)
  images.value = next
}

function remove(i: number) {
  images.value = images.value.filter((_, k) => k !== i)
}
</script>

<template>
  <div class="space-y-5">
    <div>
      <span class="mb-1 block text-xs font-semibold text-ink-600">{{ t('myTool.upload.logo') }}<template v-if="logoRequired"> *</template></span>
      <div class="flex items-center gap-3">
        <div class="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-ink-200 bg-ink-100/40">
          <img v-if="logo" :src="logo" :alt="name" class="h-full w-full object-cover">
          <span v-else class="text-xs text-ink-400">{{ t('myTool.upload.none') }}</span>
        </div>
        <div class="flex flex-col items-start gap-1">
          <label class="cursor-pointer rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-700 hover:border-brand-300">
            {{ uploading === 'logo' ? t('myTool.upload.uploading') : logo ? t('myTool.upload.change') : t('myTool.upload.choose') }}
            <input type="file" :accept="ACCEPT" class="sr-only" :disabled="!!uploading" @change="onPick($event, 'logo')">
          </label>
          <button v-if="logo" type="button" class="text-xs text-red-600 hover:underline" @click="logo = ''">{{ t('myTool.upload.remove') }}</button>
        </div>
      </div>
      <p class="mt-1 text-xs text-ink-400">{{ t('myTool.upload.logoHint') }}</p>
    </div>

    <div>
      <span class="block text-xs font-semibold text-ink-600">{{ t('myTool.upload.screenshots') }}</span>
      <p class="mt-0.5 text-xs text-ink-400">{{ t('myTool.upload.screenshotsHint', { n: maxImages }) }}</p>
      <div :class="['mt-2 grid gap-3', compact ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6']">
        <div v-for="(img, i) in images" :key="img" class="relative aspect-video overflow-hidden rounded-lg border border-ink-200 bg-ink-100/40">
          <img :src="img" alt="" class="h-full w-full object-cover">
          <span v-if="i === 0" class="absolute left-1 top-1 rounded bg-brand-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">{{ t('myTool.upload.cover') }}</span>
          <div class="absolute inset-x-0 bottom-0 flex justify-between bg-black/50 px-1 py-0.5 text-xs text-white">
            <span class="flex gap-1">
              <button type="button" :disabled="i === 0" class="px-1 disabled:opacity-30" :aria-label="t('myTool.upload.moveLeft')" @click="move(i, -1)">‹</button>
              <button type="button" :disabled="i === images.length - 1" class="px-1 disabled:opacity-30" :aria-label="t('myTool.upload.moveRight')" @click="move(i, 1)">›</button>
            </span>
            <button type="button" class="px-1" @click="remove(i)">{{ t('myTool.upload.remove') }}</button>
          </div>
        </div>
        <label v-if="images.length < maxImages" class="flex aspect-video cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-ink-200 text-xs font-semibold text-ink-500 hover:border-brand-300 hover:text-brand-600">
          {{ uploading === 'images' ? t('myTool.upload.uploading') : '+ ' + t('myTool.upload.add') }}
          <input type="file" :accept="ACCEPT" multiple class="sr-only" :disabled="!!uploading" @change="onPick($event, 'images')">
        </label>
      </div>
    </div>

    <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
  </div>
</template>
