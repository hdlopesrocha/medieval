<template src="./PackageStatusCounter.html"></template>

<script lang="ts" src="./PackageStatusCounter.ts"></script>

<style scoped>
.package-status-counter-wrap {
  display: flex;
  justify-content: center;
  width: 100%;
}

.package-status-counter {
  display: flex;
  gap: 8px;
  flex-wrap: nowrap;
  overflow-x: auto;
  max-width: 100%;
}

.package-status-item {
  min-width: 52px;
  padding: 6px 8px;
  border-radius: 6px;
  text-align: center;
  border: 1px solid #ced4da;
  background: #f8f9fa;
  color: #adb5bd;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.package-status-item.is-scanned {
  border-color: #495057;
  background: #e9ecef;
  color: #212529;
}

.package-status-icon {
  font-size: 18px;
}

.package-status-label {
  font-size: 11px;
  line-height: 1;
}
</style>
