<template src="./MiniCardItem.html"></template>

<script lang="ts" src="./MiniCardItem.ts"></script>

<style scoped>



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
/* Ensure the root button fills the played-card container so the image can size correctly */
button {
  width: 100%;
  height: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  display: block;
}

button:focus { outline: none; }
</style>
