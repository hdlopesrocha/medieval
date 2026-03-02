<template src="./MiniCardItem.html"></template>

<script lang="ts" src="./MiniCardItem.ts"></script>

<style scoped>
.mini-card-button {
  height: 25%;
  border: 1px solid rgba(0, 0, 0, 0.35);
  border-radius: 4px;
  padding: 0;
  margin: 0;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.8);
  cursor: pointer;
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
