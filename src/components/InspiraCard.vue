<template>
  <component :is="activeComponent" v-bind="passProps" />
</template>

<script lang="ts">
import { ref, computed, defineComponent, onMounted } from 'vue'
import CardItem from './CardItem.vue'

export default defineComponent({
  name: 'InspiraCard',
  props: {
    card: { type: Object, required: true },
    showExport: { type: Boolean, default: false }
  },
  setup(props) {
    const activeComponent = ref<any>(CardItem)

    const passProps = computed(() => ({ card: props.card, showExport: props.showExport }))

    onMounted(async () => {
      try {
        // attempt to load Inspira UI package; multiple export names tried for compatibility
        // The package name `inspira-ui` was added to package.json per request.
        const mod = await import('inspira-ui')
        const comp = mod?.InspiraCard || mod?.default || mod?.Card3D || mod?.Inspira3D
        if (comp) activeComponent.value = comp
      } catch (e) {
        // fallback to existing CardItem
      }
    })

    return { activeComponent, passProps }
  }
})
</script>

<style scoped>
/* minimal passthrough - Inspira card should style itself */
</style>
