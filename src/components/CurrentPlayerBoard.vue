<template src="./CurrentPlayerBoard.html"></template>

<script lang="ts" src="./CurrentPlayerBoard.ts"></script>

<style scoped>


.current-player-board-row {
  display: flex;
  gap: 16px;
<style scoped>
.current-player-board {
  color: #e9f3ff;
}
.current-player-navbar[aria-label="Secondary"] {
  display: flex;
  gap: 12px;
  align-items: center;
}
.cpb-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: inherit;
  font-weight: 600;
}
.cpb-item ion-icon {
  color: inherit;
  font-size: 1.1em;
}
</style>
.current-player-navbar {
  position: relative;
  z-index: 110;
  overflow: visible;
  display: flex;
  width: 100%;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px;
  border-radius: 8px;
  background: rgba(6, 14, 24, 0.72);
  border: 1px solid rgba(158, 186, 222, 0.2);
}

.current-player-navbar :deep(ion-button) {
  --color: #e9f3ff;
  --border-color: rgba(206, 225, 248, 0.5);
}

.current-player-navbar-links {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-start;
}

.settings-menu-wrap {
  position: relative;
}

.settings-menu {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 4px;
  min-width: 180px;
  padding: 6px;
  border-radius: 10px;
  background: #101c2d;
  color: #e9f3ff;
}

.settings-menu :deep(ion-button) {
  justify-content: flex-start;
}

.settings-menu-text {
  font-size: 13px;
  font-weight: 700;
  color: #dceeff;
  padding: 6px 8px;
}
</style>
