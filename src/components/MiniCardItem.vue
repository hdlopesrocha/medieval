<template src="./MiniCardItem.html"></template>

<script lang="ts" src="./MiniCardItem.ts"></script>

<style scoped>

.mini-card-inner {
  width: calc(100% - 8px);
  height: calc(100% - 8px);
  margin: 4px;
  border: 2px solid #ffffff;
  border-radius: 6px;
  overflow: hidden;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.12);
  background: #ffffff;
}

.mini-card-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.mini-card-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}
</style>
