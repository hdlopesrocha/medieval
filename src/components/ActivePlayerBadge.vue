<template>
  <div class="active-badge" v-if="state.players && state.players.length">
    <div class="dot" :class="dotClass"></div>
    <div class="label">
      <div class="title">Active: {{ activeName }}</div>
      <div class="sub">Round {{ state.round ?? '?' }}</div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import engine from '../game/engineInstance'

export default {
  name: 'ActivePlayerBadge',
  setup() {
    const state = ref(engine.getState())
    let timer = null
    onMounted(() => {
      timer = setInterval(() => { state.value = engine.getState() }, 500)
    })
    onUnmounted(() => { clearInterval(timer) })

    const activeId = computed(() => state.value.activePlayerId ?? 0)
    const activeName = computed(() => {
      const p = state.value.players && state.value.players[activeId.value]
      return p ? p.name : `Player ${activeId.value}`
    })
    const dotClass = computed(() => activeId.value === 0 ? 'green' : 'red')

    return { state, activeName, dotClass }
  }
}
</script>

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
