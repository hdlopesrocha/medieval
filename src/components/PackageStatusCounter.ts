import { computed } from 'vue'
import { IonIcon } from '@ionic/vue'
import { cube, cubeOutline } from 'ionicons/icons'

export default {
  name: 'PackageStatusCounter',
  components: { IonIcon },
  props: {
    total: {
      type: Number,
      required: true
    },
    scannedParts: {
      type: Array,
      default: () => []
    },
    activeIndex: {
      type: Number,
      default: -1
    },
    keyPrefix: {
      type: String,
      default: 'part'
    }
  },
  setup(props: any) {
    const safeTotal = computed(() => Math.max(0, Number(props.total) || 0))

    function isScanned(index: number) {
      return Boolean(props.scannedParts?.[index])
    }

    function isActive(index: number) {
      return Number(props.activeIndex) === index
    }

    return {
      cube,
      cubeOutline,
      safeTotal,
      isScanned,
      isActive
    }
  }
}
