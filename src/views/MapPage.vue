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
  top: 4px;
  right: 4px;
  background: rgba(0, 0, 0, 0.75);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  border-radius: 10px;
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
}

.map-card-overlay-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  background: transparent !important;
  box-shadow: none !important;
  border: none !important;
}

.map-card-overlay-root {
  position: fixed;
  inset: 0;
  z-index: 20000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.55);
}



.map-card-overlay-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: center;
  width: fit-content;
  max-width: 96vw;
}

@keyframes mapPopoverScaleIn {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}
</style>
