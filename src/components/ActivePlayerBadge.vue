<template src="./ActivePlayerBadge.html"></template>

<script lang="ts" src="./ActivePlayerBadge.ts"></script>

<style scoped>
.active-badge {
  position: fixed;
  top: 12px;
  right: 12px;
  display:flex;
  align-items:center;
  gap:10px;
  background: rgba(0,0,0,0.55);
  color: #fff;
  padding: 8px 12px;
  border-radius: 20px;
  z-index: 1000;
  box-shadow: 0 6px 18px rgba(0,0,0,0.35);
  font-weight:600;
}
.active-badge .dot { width:14px; height:14px; border-radius:50%; }
.active-badge .dot.green { background: #4caf50 }
.active-badge .dot.red { background: #f44336 }
.active-badge .label { display:flex; flex-direction:column; line-height:1 }
.active-badge .title { font-size:13px }
.active-badge .sub { font-size:11px; opacity:0.85 }
</style>
