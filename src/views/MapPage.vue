<template src="./MapPage.html"></template>

<script lang="ts" src="./MapPage.ts"></script>

<style scoped>
.maps-row {
  display: flex;
  flex-wrap: nowrap;
  overflow: hidden;
  align-items: flex-start;
  height: 600px;
}

.map-surface {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}



.map-image-strip {
  position: absolute;
  inset: 0;
  display: flex;
  width: 100%;
  height: 100%;
}

.map-image {
  width: 12.5%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.map-image-flipped {
  transform: scaleX(-1);
  filter: sepia(1.0) hue-rotate(-20deg) saturate(3) hue-rotate(-28deg) brightness(1.08) contrast(1.04);
}

.zones-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 2;
}

.zone-cell {
  position: absolute;
  top: 0;
  height: 100%;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  overflow-y: auto;
  overflow-x: hidden;
}

.zone-overflow-badge {
  position: absolute;

  background: rgba(0, 0, 0, 0.75);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  border-radius: 4px;
  z-index: 3;
}

.zone-stack {
  width: 100%;
  overflow: visible;
  display: flex;
  flex-direction: column;
  flex-wrap: nowrap;
  align-items: stretch;
  justify-content: flex-start;
  gap: 2px;
}

.zone-stack-rtl {
  align-items: stretch;
}

.played-card {
  width: 100%;
  aspect-ratio: 4 / 3;
  height: auto;
  flex: 0 0 auto;
  max-width: 100%;
  display: flex;
  justify-content: stretch;
  pointer-events: auto;
  border: 4px solid #fff;
  border-radius: 8px;
}

.map-card-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  /* Desired sizing: 80% of popover height and 2/3 aspect ratio */
  height: 80%;
  aspect-ratio: 2 / 3;
  width: auto;
  max-width: min(80vw, 480px);
  box-sizing: border-box;
  overflow: hidden;
  justify-content: center;
}

/* Make the inner card stretch to the container to avoid extra white bars */
.map-card-content .card-wrapper {
  height: 100% !important;
  width: 100% !important;
  margin: 0 !important;
  box-sizing: border-box !important;
  display: flex !important;
  flex-direction: column !important;
}

.map-card-content .card-image, .map-card-content ion-img {
  max-height: 48% !important;
  width: auto !important;
}

.map-card-actions {
  display: flex;
  gap: 8px;
  justify-content: center;
}

/* Confirm popover styles (moved from ConfirmActionModal) */
.map-confirm-popover::part(content) {
  background: transparent;
  box-shadow: none;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0;
}
.confirm-box-popover{
  background: #fff;
  padding: 14px;
  border-radius: 8px;
  min-width: 260px;
  max-width: 90vw;
  box-shadow: 0 6px 20px rgba(0,0,0,0.15);
  display:flex;flex-direction:column;gap:12px;
}
.confirm-title{font-weight:700;font-size:16px}
.confirm-message{color:#333;font-size:14px}
.confirm-actions{display:flex;gap:8px;justify-content:flex-end}

@keyframes mapPopoverScaleIn {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}
</style>
