<template src="./LocalPlayerPage.html"></template>

<script lang="ts" src="./LocalPlayerPage.ts"></script>

<style scoped>
.main-page-wrap { padding: 16px }
.confirm-page { position:fixed; inset:0; z-index:20000; width:100vw; min-height:100vh; display:flex; flex-direction:column; justify-content:center; align-items:center; background:rgba(0,0,0,0.55); padding:16px; overflow:auto }
.confirm-card-actions { display:flex; gap:6px; justify-content:center }
.confirm-actions-row { display:flex; gap:10px; justify-content:flex-end }
.selection-page { position:fixed; inset:0; z-index:20000; width:100vw; min-height:100vh; display:flex; flex-direction:column; background:rgba(0,0,0,0.55); padding:16px; overflow:auto }
.candidates { display:flex; flex-wrap:wrap; gap:12px }
.candidate { min-width:220px; border:1px solid #eee; padding:8px; border-radius:6px; background:#fafafa }
</style>
