<template>
  <div v-show="visible" class="h-scroll-slider" aria-hidden="false">
    <input
      class="h-scroll-range"
      type="range"
      :min="0"
      :max="max"
      v-model.number="pos"
      @input="onInput"
      @pointerdown="onPointerDown"
      @pointerup="onPointerUp"
    />
  </div>
</template>

<script lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

export default {
  name: 'HorizontalScrollSlider',
  props: {
    targetSelector: {
      type: String,
      default: ''
    }
  },
  setup(props: { targetSelector: string }) {
    const pos = ref(0)
    const max = ref(0)
    const visible = ref(false)
    let isDragging = false
    let targetEl: HTMLElement | Document = document.documentElement
    let ro: ResizeObserver | null = null

    function findScrollable(): HTMLElement | Document {
      // If a target selector was provided, prefer it
      try {
        if (props && props.targetSelector) {
          const el = document.querySelector(props.targetSelector) as HTMLElement | null
          if (el) return el
        }
      } catch (e) {
        // ignore selector errors
      }
      // Prefer the app global view or an ion-content if present, otherwise choose
      // the element with the largest horizontal overflow.
      const candidates: Array<HTMLElement | Document> = []
      const appView = document.querySelector('.app-global-view') as HTMLElement | null
      if (appView) candidates.push(appView)
      const ionContents = Array.from(document.querySelectorAll('ion-content')) as HTMLElement[]
      ionContents.forEach(c => candidates.push(c))
      // scan for any element that currently overflows horizontally
      const els = Array.from(document.querySelectorAll<HTMLElement>('body *'))
      for (const el of els) {
        try {
          const style = window.getComputedStyle(el)
          if (style.display === 'none' || style.visibility === 'hidden') continue
          if (el.scrollWidth > el.clientWidth) candidates.push(el)
        } catch (e) {
          // ignore elements we cannot inspect
        }
      }
      candidates.push(document.documentElement)
      // choose candidate with max overflow
      let best: HTMLElement | Document = document.documentElement
      let bestOverflow = 0
      for (const c of candidates) {
        const sw = (c as any).scrollWidth || 0
        const cw = (c as any).clientWidth || (window.innerWidth || 0)
        const ov = Math.max(0, sw - cw)
        if (ov > bestOverflow) {
          bestOverflow = ov
          best = c
        }
      }
      return best
    }

    function update() {
      const doc = targetEl || document.documentElement
      const scrollW = (doc as any).scrollWidth || 0
      const clientW = (doc as any).clientWidth || window.innerWidth || 0
      const m = Math.max(0, scrollW - clientW)
      max.value = m
      visible.value = m > 16 && window.matchMedia('(pointer: fine) and (hover: hover)').matches
      pos.value = Math.min(m, Math.max(0, (doc as any).scrollLeft || window.scrollX || 0))
    }

    function onScroll() {
      if (isDragging) return
      const doc = targetEl || document.documentElement
      pos.value = Math.min(max.value, Math.max(0, (doc as any).scrollLeft || window.scrollX || 0))
    }

    function onInput() {
      const x = Math.trunc(pos.value || 0)
      window.scrollTo({ left: x })
    }

    function onPointerDown() { isDragging = true }
    function onPointerUp() { isDragging = false }

    function attachTarget(t: HTMLElement | Document) {
      // detach previous
      if (ro) { try { ro.disconnect() } catch (e) {} ro = null }
      try { window.removeEventListener('scroll', onScroll) } catch (e) {}
      targetEl = t || document.documentElement
      // listen to scroll on target (if element) otherwise window
      if ((targetEl as HTMLElement) instanceof HTMLElement) {
        (targetEl as HTMLElement).addEventListener('scroll', onScroll, { passive: true })
        ro = new ResizeObserver(update)
        try { ro.observe(targetEl as Element) } catch (e) { ro.disconnect(); ro = null }
      } else {
        window.addEventListener('scroll', onScroll, { passive: true })
        ro = new ResizeObserver(update)
        ro.observe(document.documentElement)
      }
      update()
    }

    onMounted(() => {
      const best = findScrollable()
      attachTarget(best)
      window.addEventListener('resize', update, { passive: true })
      window.addEventListener('orientationchange', update, { passive: true })
      // also re-evaluate periodically in case layout changes
      const interval = setInterval(() => {
        const newBest = findScrollable()
        if (newBest !== targetEl) attachTarget(newBest)
        else update()
      }, 800)
      onUnmounted(() => { clearInterval(interval) })
    })

    onUnmounted(() => {
      try { window.removeEventListener('resize', update) } catch (e) {}
      try { window.removeEventListener('orientationchange', update) } catch (e) {}
      try { if ((targetEl as HTMLElement) instanceof HTMLElement) (targetEl as HTMLElement).removeEventListener('scroll', onScroll) } catch (e) {}
      try { window.removeEventListener('scroll', onScroll) } catch (e) {}
      if (ro) { try { ro.disconnect() } catch (e) {} ro = null }
    })

    return { pos, max, visible, onInput, onPointerDown, onPointerUp }
  }
}
</script>

<style scoped>
.h-scroll-slider {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: 8px;
  width: min(90vw, 1100px);
  z-index: 15000;
  pointer-events: auto;
  display: flex;
  align-items: center;
  justify-content: center;
}
.h-scroll-range {
  width: 100%;
  -webkit-appearance: none;
  height: 6px;
  background: rgba(0,0,0,0.15);
  border-radius: 6px;
}
.h-scroll-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #ffffff;
  border: 2px solid rgba(0,0,0,0.4);
  box-shadow: 0 1px 2px rgba(0,0,0,0.3);
}
/* hide on touch devices */
@media (pointer: coarse), (hover: none) {
  .h-scroll-slider { display: none !important }
}
</style>
