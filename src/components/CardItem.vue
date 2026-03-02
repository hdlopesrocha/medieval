<template src="./CardItem.html"></template>

<script lang="ts" src="./CardItem.ts"></script>

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

.subcat-icons-row {
  margin-top: 6px;
  display: flex;
  gap: 8px;
  align-items: center;
}

.subcat-icon-item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 54px;
  height: 46px;
  padding: 0 10px;
  border-radius: 23px;
  background: rgba(0, 0, 0, 0.06);
  line-height: 1;
}

.subcat-icon {
  font-size: 32px;
}
</style>
