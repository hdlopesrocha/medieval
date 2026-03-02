import { computed, defineComponent, type PropType } from 'vue'
import type { CardJSON } from '../models/Card'

export default defineComponent({
  name: 'ModalCard',
  props: {
    card: {
      type: Object as PropType<Partial<CardJSON> & Record<string, unknown>>,
      required: true
    }
  },
  setup(props) {
    const cardTitle = computed(() => String(props.card?.title || 'Unknown Card'))
    const attackPoints = computed(() => Number(props.card?.attackPoints ?? 0))
    const defensePoints = computed(() => Number(props.card?.defensePoints ?? 0))
    const hp = computed(() => Number(props.card?.hp ?? 0))
    const velocity = computed(() => Number(props.card?.velocity ?? 0))
    const range = computed(() => Number(props.card?.range ?? 0))
    const category = computed(() => String(props.card?.category || '').trim())
    const subCategory = computed(() => String(props.card?.subCategory || '').trim())
    const element = computed(() => String(props.card?.element || '').trim())
    const description = computed(() => String(props.card?.description || '').trim())
    const effectDescription = computed(() => String(props.card?.effectDescription || '').trim())

    return {
      cardTitle,
      attackPoints,
      defensePoints,
      hp,
      velocity,
      range,
      category,
      subCategory,
      element,
      description,
      effectDescription
    }
  }
})
