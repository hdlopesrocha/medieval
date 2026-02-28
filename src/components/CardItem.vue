<template>
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

        <div class="hp-section">
          <div class="hp-label">HP</div>
          <div class="hp-bar">
            <div class="hp-remaining" :style="{ width: hpPercent + '%' }"></div>
          </div>
          <div class="hp-value">{{ card.hp }} / {{ card.maxHp ?? 10 }}</div>
        </div>
      </ion-card-content>
    </template>
  </ion-card>
</template>

<script>
import { IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonImg, IonChip } from '@ionic/vue'

export default {
  name: 'CardItem',
  props: {
    card: { type: Object, required: true },
    hidden: { type: Boolean, default: false }
  },
  components: { IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonImg, IonChip },
  computed: {
    hpPercent() {
      const hp = Number(this.card.hp ?? 0)
      const max = Number(this.card.maxHp ?? 10)
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
}
</script>

<style scoped>
ion-card {
  max-width: 320px;
  margin: 8px;
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
