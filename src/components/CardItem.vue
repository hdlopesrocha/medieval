<template>
  <div class="card-item-wrapper">
    <ion-card>
    <div v-if="hidden" class="card-back">
      <div class="card-back-text">Card Back</div>
    </div>
    <template v-else>
      <ion-card-header>
        <div class="card-header-row">
          <ion-card-title class="card-title">{{ card.title }}</ion-card-title>
          <ion-chip class="card-type">{{ card.type }}</ion-chip>
        </div>

      </ion-card-header>
      <ion-card-content>
        <ion-img :src="imageSrc" alt="card image" />

        <div class="card-text-block">
          <p class="description">{{ card.description }}</p>
          <p v-if="card.effectDescription" class="effect-description"><strong>Effect:</strong> {{ card.effectDescription }}</p>
        </div>
        <div class="attributes">
          <div class="attr"><span class="attr-icon">⚔️</span><span class="attr-label">ATK</span><span class="attr-value">{{ card.attackPoints }}</span></div>
          <div class="attr"><span class="attr-icon">🛡️</span><span class="attr-label">DEF</span><span class="attr-value">{{ card.defensePoints }}</span></div>
          <div class="attr hp-compact">
            <span class="attr-icon">❤️</span>
            <span class="attr-label">HP</span>
            <span class="attr-value">{{ card.hp }}</span>
          </div>
          <div class="attr"><span class="attr-icon">💨</span><span class="attr-label">VEL</span><span class="attr-value">{{ card.velocity }}</span></div>
          <div class="attr"><span class="attr-icon">🎯</span><span class="attr-label">RNG</span><span class="attr-value">{{ card.range }}</span></div>
        </div>


      </ion-card-content>
    </template>
  </ion-card>
    <button v-if="showExportButton" class="export-btn" @click="exportCardToPng">Export PNG</button>
  </div>
</template>

<script>
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
      // If images are referenced under /images/..., map to /src/images/ so Vite serves them
      if (p.startsWith('/images/')) return '/src' + p
      return p
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
</script>

<style scoped>
ion-card {
  max-width: 320px;
  margin: 8px;
}

.card-item-wrapper { display:inline-block; position:relative }
.export-btn {
  position: absolute;
  right: -8px;
  top: -8px;
  background: #0a74ff;
  color: #fff;
  border: none;
  padding: 6px 10px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 700;
}
.export-btn:hover { opacity: 0.95 }

/* Enforce a 3:4 ratio for all card items */
.card-item-wrapper ion-card {
  width: 320px;
  max-width: 100%;
  aspect-ratio: 3 / 5;
  display: block;
  overflow: hidden;
}
.card-item-wrapper ion-img,
.card-item-wrapper img {
  width: 100%;
  height: auto;
  object-fit: cover;
}



.hp-section {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.hp-label {
  width: 28px;
  font-weight: 600;
}

.hp-bar {
  flex: 1;
  height: 12px;
  background: #ff4d4f; /* red full */
  border-radius: 6px;
  overflow: hidden;
}

.hp-remaining {
  height: 100%;
  background: #4caf50; /* green */
  transition: width 0.3s ease;
}

.hp-value {
  width: 56px;
  text-align: right;
  font-weight: 600;
}

.attributes {
  display:flex;
  gap:10px;
  flex-wrap:wrap;
  margin-top:8px;
  align-items:center;
}

.attr {
  display:flex;
  gap:6px;
  align-items:center;
  background: rgba(255,255,255,0.06);
  padding: 4px 8px;
  border-radius: 6px;
  font-weight:600;
}

.attr-icon { font-size: 16px }
.attr-label { opacity: 0.9 }
.attr-value { margin-left:6px }

.hp-compact { background: rgba(255,255,255,0.02) }

.card-back { display:flex; align-items:center; justify-content:center; height:220px; background: linear-gradient(135deg,#2b2b2b,#1b1b1b); color:#fff; border-radius:6px }
.card-back-text { font-weight:800; font-size:18px; letter-spacing:1px }

.card-header-row { display:flex; align-items:center; justify-content:space-between; gap:8px }
.card-title { text-align:left; flex:1; margin:0; padding-right:8px }
.card-type { margin-left:auto }
.effect-description { margin-top:8px; font-weight:700; color:#2a6 }

.card-text-block {
  border: 1px solid rgba(0,0,0,0.08);
  padding: 8px;
  border-radius: 6px;
  background: rgba(255,255,255,0.02);
  margin-top: 8px;
}
.card-text-block .description { margin: 0 0 6px 0 }
</style>
