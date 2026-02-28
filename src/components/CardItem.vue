<template>
  <ion-card>
    <div v-if="hidden" class="card-back">
      <div class="card-back-text">Card Back</div>
    </div>
    <template v-else>
      <div v-if="card.cost !== undefined && card.cost !== null" class="cost-badge">{{ card.cost }}</div>
      <ion-img :src="imageSrc" alt="card image" />
      <ion-card-header>
        <ion-card-title>{{ card.title }}</ion-card-title>
        <ion-chip>{{ card.type }}</ion-chip>
      </ion-card-header>
      <ion-card-content>
        <p>{{ card.description }}</p>
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
          <div class="hp-value">{{ card.hp }} / 10</div>
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
      const pct = Math.round((hp / 10) * 100)
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

.cost-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(0,0,0,0.7);
  color: #fff;
  padding: 4px 8px;
  border-radius: 12px;
  font-weight: 700;
  font-size: 12px;
  z-index: 5;
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
</style>
