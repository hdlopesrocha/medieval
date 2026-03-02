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
      const path = props.card?.imageUrl || ''
      if (!path) return ''
      if (/^https?:\/\//.test(path)) return path
      if (path.startsWith('/')) return path
      return path.replace(/^\/?(?:src|public)\//, '')
    })

    const imageAlt = computed<string>(() => props.card?.title || 'card')

    const onSelect = () => {
      emit('select', props.card)
    }

    return {
      imageSrc,
      imageAlt,
      onSelect
    }
  }
})
