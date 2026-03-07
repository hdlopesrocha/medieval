import { computed, defineComponent, type PropType } from 'vue'
import type Card from '../models/Card'

export default defineComponent({
  name: 'MiniCardItem',
  props: {
    card: { type: Object as PropType<Card>, required: true }
  },
  emits: ['select'],
  setup(props, { emit }) {
    const imageSrc = computed<string>(() => {
      const p = props.card?.imageUrl || ''
      if (!p) return ''
      if (/^https?:\/\//.test(p)) return p
      const base = import.meta.env.BASE_URL || '/'
      const isProd = Boolean(import.meta.env.PROD)

      if (p.startsWith('/')) {
        return isProd ? (base.replace(/\/$/, '') || '') + p : p
      }

      const normalized = p.replace(/^\/?(?:src|public)\//, '')
      return isProd ? base + normalized : (normalized || p)
    })

    const imageAlt = computed<string>(() => 
      props.card?.title || 'card'
    )

    return {
      imageSrc,
      imageAlt
    }
  }
})
