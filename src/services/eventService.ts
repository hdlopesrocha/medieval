type Handler = (...args: any[]) => void

class EventService {
  private listeners: Record<string, Set<Handler>> = {}

  on(event: string, cb: Handler) {
    if (!this.listeners[event]) this.listeners[event] = new Set()
    this.listeners[event].add(cb)
    return () => this.off(event, cb)
  }

  off(event: string, cb: Handler) {
    try { this.listeners[event]?.delete(cb) } catch (_) {}
  }

  once(event: string, cb: Handler) {
    const unsub = this.on(event, (...args: any[]) => {
      try { cb(...args) } finally { unsub() }
    })
    return unsub
  }

  emit(event: string, ...args: any[]) {
    const set = this.listeners[event]
    if (!set) return
    for (const cb of Array.from(set)) {
      try { cb(...args) } catch (_e) { /* swallow listener errors */ }
    }
  }

  clear() {
    this.listeners = {}
  }
}

const eventService = new EventService()
export default eventService
