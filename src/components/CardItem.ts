import { IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonImg, IonChip } from '@ionic/vue'
import html2canvas from 'html2canvas'

export default {
  name: 'CardItem',
  props: {
    card: { type: Object, required: true },
    hidden: { type: Boolean, default: false },
    showExport: { type: Boolean, default: null }
  },
  components: { IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonImg, IonChip },
  computed: {
    showExportButton() {
      // explicit prop takes precedence; null means "auto-detect via route"
      if (this.showExport !== null) return Boolean(this.showExport)
      try {
        return Boolean(this.$route && String(this.$route.path || '').toLowerCase().includes('deck'))
      } catch (e) {
        return false
      }
    },
    hpPercent() {
      const hp = Number(this.card.hp ?? 0)
      const max = 10
      const pct = max > 0 ? Math.round((hp / max) * 100) : 0
      return Math.max(0, Math.min(100, pct))
    },
    imageSrc() {
      const p = this.card?.imageUrl || ''
      if (!p) return ''
      if (/^https?:\/\//.test(p)) return p
      const base = import.meta.env.BASE_URL || '/'
      const isProd = Boolean(import.meta.env.PROD)

      // Absolute paths starting with `/` should remain absolute during dev,
      // but in production we need to prefix with the configured base.
      if (p.startsWith('/')) {
        return isProd ? (base.replace(/\/$/, '') || '') + p : p
      }

      // Normalize common dev paths like `src/...` or `public/...` to a relative path.
      const normalized = p.replace(/^\/?(?:src|public)\//, '')

      // Only apply the runtime base in production (when `dist` was built).
      return isProd ? base + normalized : normalized || p
    }
  }
  ,
  methods: {
    async exportCardToPng() {
      // Build a plain DOM representation of the card (avoid shadow DOM of Ionic web components)
      const el = this.$el.querySelector('ion-card') || this.$el
      const rect = el.getBoundingClientRect()
      const width = Math.max(120, Math.round(rect.width)) || 360
      const height = Math.max(160, Math.round(width * 4 / 3))
      const imgH = Math.floor(width * 0.5)

      const wrapper = document.createElement('div')
      wrapper.style.position = 'fixed'
      wrapper.style.left = '-9999px'
      wrapper.style.top = '0'
      wrapper.style.zIndex = '99999'
      // base styles to approximate the card look, using rendered width to keep 3:4 ratio
      wrapper.innerHTML = `
        <div style="width: ${width}px; padding:16px; box-sizing:border-box; background:#fff; border-radius:8px; box-shadow:0 6px 18px rgba(0,0,0,0.12); color:#111; font-family: sans-serif;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <div style="font-weight:800;font-size:18px;">${this._escapeHtml(this.card.title || '')}</div>
            <div style="background:#eee;padding:4px 8px;border-radius:6px;font-weight:700;">${this._escapeHtml(String(this.card.type || ''))}</div>
          </div>
          ${this.card.imageUrl ? `<img src="${this._escapeAttr(this.imageSrc)}" style="width:100%;height:${imgH}px;object-fit:cover;border-radius:6px;margin-bottom:8px;"/>` : ''}
          <div style="border:1px solid rgba(0,0,0,0.06);padding:8px;border-radius:6px;margin-bottom:8px;color:#333;">
            <div style="margin-bottom:6px">${this._escapeHtml(this.card.description || '')}</div>
            ${this.card.effectDescription ? `<div style="font-weight:700;color:#0a6">Effect: ${this._escapeHtml(this.card.effectDescription)}</div>` : ''}
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;font-weight:700">
            <div style="background:rgba(0,0,0,0.04);padding:6px 8px;border-radius:6px">⚔️ ATK ${this._escapeHtml(String(this.card.attackPoints ?? ''))}</div>
            <div style="background:rgba(0,0,0,0.04);padding:6px 8px;border-radius:6px">🛡️ DEF ${this._escapeHtml(String(this.card.defensePoints ?? ''))}</div>
            <div style="background:rgba(0,0,0,0.04);padding:6px 8px;border-radius:6px">❤️ HP ${this._escapeHtml(String(this.card.hp ?? ''))}</div>
            <div style="background:rgba(0,0,0,0.04);padding:6px 8px;border-radius:6px">💨 VEL ${this._escapeHtml(String(this.card.velocity ?? ''))}</div>
            <div style="background:rgba(0,0,0,0.04);padding:6px 8px;border-radius:6px">🎯 RNG ${this._escapeHtml(String(this.card.range ?? ''))}</div>
          </div>
        </div>
      `
      document.body.appendChild(wrapper)
      try {
        const canvas = await html2canvas(wrapper, { backgroundColor: null, scale: window.devicePixelRatio || 1, useCORS: true })
        if (!canvas) return
        await new Promise((resolve) => canvas.toBlob((blob) => {
          if (!blob) return resolve(null)
          const link = document.createElement('a')
          link.href = URL.createObjectURL(blob)
          const safeTitle = (this.card.title || 'card').replace(/[^a-z0-9-_]/gi, '_')
          link.download = `${safeTitle}.png`
          document.body.appendChild(link)
          link.click()
          link.remove()
          URL.revokeObjectURL(link.href)
          resolve(true)
        }))
      } catch (e) {
        // ignore
      } finally {
        wrapper.remove()
      }
    },
    _escapeHtml(s) { return String(s).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]) },
    _escapeAttr(s) { return String(s).replace(/"/g, '&quot;') },
    _inlineAllStyles(source, target) {
      try {
        const origNodes = [source].concat(Array.from(source.querySelectorAll('*')))
        const cloneNodes = [target].concat(Array.from(target.querySelectorAll('*')))
        for (let i = 0; i < origNodes.length; i++) {
          const o = origNodes[i]
          const c = cloneNodes[i]
          if (!c || !o) continue
          const cs = window.getComputedStyle(o)
          let cssText = ''
          for (let j = 0; j < cs.length; j++) {
            const prop = cs[j]
            try { cssText += `${prop}:${cs.getPropertyValue(prop)};` } catch (e) { }
          }
          c.setAttribute('style', cssText)
          // ensure images keep src attribute (ion-img uses inner img)
          if (o.tagName === 'IMG' || o.querySelector && o.querySelector('img')) {
            const origImg = o.tagName === 'IMG' ? o : o.querySelector('img')
            const cloneImg = c.tagName === 'IMG' ? c : c.querySelector('img')
            if (origImg && cloneImg) {
              cloneImg.setAttribute('src', origImg.getAttribute('src') || origImg.src || '')
            }
          }
        }
      } catch (e) {
        // ignore styling errors
      }
    }
  }
}
