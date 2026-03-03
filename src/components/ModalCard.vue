<template src="./ModalCard.html"></template>

<script lang="ts" src="./ModalCard.ts"></script>

<style scoped>
.modal-card {
  min-width: 240px;
  border: 1px solid #d6dce6;
  border-radius: 8px;
  padding: 10px;
  background: #fff;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.modal-card-title {
  font-weight: 800;
  font-size: 15px;
  color: #1d2633;
}

.modal-card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 12px;
  color: #334;
}

.modal-card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.modal-card-tags span {
  font-size: 11px;
  background: #eef3fa;
  color: #1f3550;
  border-radius: 12px;
  padding: 2px 8px;
}

.modal-card-text {
  font-size: 13px;
  color: #2d3748;
  line-height: 1.35;
}

.modal-card-effect {
  color: #0b3d69;
  font-weight: 600;
}
</style>
