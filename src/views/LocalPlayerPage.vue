<template src="./LocalPlayerPage.html"></template>

<script lang="ts" src="./LocalPlayerPage.ts"></script>

<style scoped>
.selection-overlay { position: fixed; inset: 0; display:flex; align-items:center; justify-content:center; background: rgba(0,0,0,0.45); z-index: 2000 }
.selection-box { background: #fff; padding: 16px; border-radius: 8px; width: min(960px, 92%); max-height: 80vh; overflow:auto }
.candidates { display:flex; flex-wrap:wrap; gap:12px }
.candidate { min-width:220px; border:1px solid #eee; padding:8px; border-radius:6px; background:#fafafa }
</style>
