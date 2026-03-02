<template src="./MapPage.html"></template>

<script lang="ts" src="./MapPage.ts"></script>

<style scoped>
.maps-row {
  display: flex;
  flex-wrap: nowrap;
  gap: 10px;
  overflow-x: auto;
  align-items: flex-start;
}

.map-panel {
  min-width: 46%;
  flex: 1 0 46%;
}

.map-surface {
  position: relative;
  width: 100%;
  max-height: 400px;
}

.map-image {
  width: 100%;
  height: auto;
  max-height: 400px;
  display: block;
  border-radius: 6px;
}

.map-image-flipped {
  transform: scaleX(-1);
}

.zones-overlay {
  position: absolute;
  inset: 0;
  z-index: 2;
}

.zone-cell {
  position: absolute;
  top: 0;
  height: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 6px;
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
  padding: 3px 6px;
  border-radius: 10px;
  z-index: 3;
}

.zone-stack {
  width: 100%;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-wrap: wrap;
  align-content: flex-end;
  align-items: flex-end;
}

.played-card {
  width: 50%;
  height: 50%;
  flex: 0 0 50%;
  max-width: 50%;
  max-height: 50%;
  display: flex;
  justify-content: stretch;
  pointer-events: auto;
}

.played-card :deep(.mini-card-button) {
  height: 100% !important;
  width: 100% !important;
}
</style>
