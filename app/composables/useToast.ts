// Small transient messages, shown by <AppToaster> (mounted once in app.vue).
export interface Toast {
  id: number
  message: string
  type: 'info' | 'warning' | 'error'
}

let nextId = 1
// Browser-only module state rather than useState(): toasts belong to this tab, not
// to a server render, and must outlive the navigation that may follow show().
const toasts = ref<Toast[]>([])

export function useToast() {
  function dismiss(id: number) {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }

  function show(message: string, { type = 'info', duration = 4000 }: { type?: Toast['type']; duration?: number } = {}) {
    // The list is module state shared by the whole server process: a toast queued
    // during server rendering would reach other visitors.
    if (import.meta.server) return 0
    // The same message again restarts it instead of stacking copies.
    toasts.value = toasts.value.filter(t => t.message !== message)
    const id = nextId++
    toasts.value = [...toasts.value, { id, message, type }]
    setTimeout(() => dismiss(id), duration)
    return id
  }

  return { toasts, show, dismiss }
}
