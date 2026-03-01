<template src="./Board.html"></template>

<script lang="ts" src="./Board.ts"></script>

<style scoped>
.board.grid { display:grid; grid-template-columns: repeat(4, 1fr); gap:12px; align-items:start; }
.zone { min-height:260px; border-radius:8px; padding:8px; background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(0,0,0,0.06)); box-shadow: 0 1px 0 rgba(0,0,0,0.06); border: 1px solid rgba(255,255,255,0.04) }
.zone-header { display:flex; gap:8px; align-items:center; margin-bottom:8px }
.zone-index { width:28px; height:28px; display:flex; align-items:center; justify-content:center; border-radius:50%; background: rgba(0,0,0,0.25); font-weight:700 }
.zone-title { font-weight:700 }
.player-zone { border-color: rgba(76,175,80,0.2) }
.enemy-zone { border-color: rgba(244,67,54,0.14) }
.zone-cards { display:flex; flex-direction:column; gap:8px }
.card-wrap[draggable="true"] { cursor:grab }

.zone.reachable { box-shadow: 0 0 0 4px rgba(76,175,80,0.08) inset; border-color: rgba(76,175,80,0.35); }
.zone.reachable.hovered { box-shadow: 0 0 12px rgba(76,175,80,0.25); transform: translateY(-3px); }
.zone.hovered { box-shadow: 0 0 12px rgba(0,0,0,0.12); }
.blocked-overlay { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; background: rgba(0,0,0,0.65); color:#fff; font-weight:700; border-radius:8px; z-index:10 }
.zone { position:relative }
.in-range { position:absolute; inset:0; border-radius:8px; pointer-events:none; z-index:2 }
.in-range.range-0 { box-shadow: inset 0 0 0 4px rgba(76,175,80,0.06); }
.in-range.range-1 { box-shadow: inset 0 0 0 6px rgba(76,175,80,0.09); }
.in-range.range-2 { box-shadow: inset 0 0 0 8px rgba(76,175,80,0.11); }
.in-range.range-3 { box-shadow: inset 0 0 0 10px rgba(76,175,80,0.14); }
.in-range.range-4 { box-shadow: inset 0 0 0 12px rgba(76,175,80,0.17); }
.in-range.range-5 { box-shadow: inset 0 0 0 14px rgba(76,175,80,0.20); }
.in-range.range-6 { box-shadow: inset 0 0 0 16px rgba(76,175,80,0.23); }
.in-range.range-7 { box-shadow: inset 0 0 0 18px rgba(76,175,80,0.26); }
.in-range.range-8 { box-shadow: inset 0 0 0 20px rgba(76,175,80,0.30); }

@keyframes shakeX {
  0% { transform: translateX(0) }
  20% { transform: translateX(-6px) }
  40% { transform: translateX(6px) }
  60% { transform: translateX(-4px) }
  80% { transform: translateX(4px) }
 100% { transform: translateX(0) }
}
.shake { animation: shakeX 0.6s cubic-bezier(.36,.07,.19,.97); }
</style>
