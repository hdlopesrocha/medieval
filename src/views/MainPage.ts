import { onMounted, onBeforeUnmount, watch, ref, nextTick } from 'vue'
import { IonPage, IonContent, IonButton, IonIcon } from '@ionic/vue'
import { useRouter } from 'vue-router'
import { useWebrtcQrService } from '../services/webrtcQrService'
import CardItem from '../components/CardItem.vue'
import PackageStatusCounter from '../components/PackageStatusCounter.vue'

export default {
  name: 'MainPage',
  components: { IonPage, IonContent, IonButton, IonIcon, CardItem, PackageStatusCounter },
  setup() {
    const router = useRouter()
    const webrtcQr = useWebrtcQrService()
    const scanOfferButtonRef = ref<any>(null)
    const mainContentRef = ref<any>(null)
    const pendingOfferButtonScroll = ref(false)
    const offerQrImageRef = ref<HTMLImageElement | null>(null)
    const answerQrImageRef = ref<HTMLImageElement | null>(null)
    const didFocusOfferQr = ref(false)
    const didFocusAnswerQr = ref(false)

    const goHandPage = () => {
      webrtcQr.setRole('local')
      router.push('/hand')
    }

    const goRealtimeGame = () => {
      router.push('/hand')
    }

    const goHistory = () => {
      router.push('/history')
    }

    const requestHistory = () => {
      webrtcQr.requestHistoryFromServer()
    }

    const scrollOfferButtonToTop = async () => {
      await nextTick()
      const refValue = scanOfferButtonRef.value
      const hostEl = refValue?.$el || refValue
      if (typeof refValue?.setFocus === 'function') {
        try {
          await refValue.setFocus()
        } catch {}
      } else if (hostEl && typeof hostEl.focus === 'function') {
        hostEl.focus()
      }
      const contentRef = mainContentRef.value
      const scrollEl = await contentRef?.getScrollElement?.()
      if (hostEl && scrollEl) {
        const buttonRect = hostEl.getBoundingClientRect()
        const scrollRect = scrollEl.getBoundingClientRect()
        const targetTop = Math.max(0, scrollEl.scrollTop + (buttonRect.top - scrollRect.top))
        if (typeof contentRef?.scrollToPoint === 'function') {
          await contentRef.scrollToPoint(0, targetTop, 450)
        } else if (typeof scrollEl.scrollTo === 'function') {
          scrollEl.scrollTo({ top: targetTop, behavior: 'smooth' })
        }
      } else if (hostEl && typeof hostEl.scrollIntoView === 'function') {
        hostEl.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' })
      }
    }

    const startOfferScanner = async () => {
      pendingOfferButtonScroll.value = true
      await webrtcQr.startScanner('offer')
      if (!webrtcQr.scanning?.value) pendingOfferButtonScroll.value = false
    }

    const onQrImageLoad = async (kind: 'offer' | 'answer') => {
      const alreadyFocused = kind === 'offer' ? didFocusOfferQr.value : didFocusAnswerQr.value
      if (alreadyFocused) return
      await nextTick()
      const targetEl = kind === 'offer' ? offerQrImageRef.value : answerQrImageRef.value
      if (targetEl && typeof targetEl.focus === 'function') targetEl.focus()
      if (kind === 'offer') didFocusOfferQr.value = true
      else didFocusAnswerQr.value = true
    }

    watch(
      () => {
        const connected = Boolean(webrtcQr.connectedHost?.value || webrtcQr.connectedClient?.value)
        const role = String(webrtcQr.activeRole?.value || '')
        return connected && (role === 'server' || role === 'client')
      },
      (isConnected) => {
        if (isConnected) router.push('/hand')
      }
    )

    watch(
      () => ({
        scanning: Boolean(webrtcQr.scanning?.value),
        status: String(webrtcQr.scanStatus?.value || '')
      }),
      async ({ scanning, status }) => {
        if (!pendingOfferButtonScroll.value) return
        const ready = scanning && status.toLowerCase().includes('point camera')
        if (!ready) return
        pendingOfferButtonScroll.value = false
        await scrollOfferButtonToTop()
      },
      { deep: false }
    )

    watch(() => String(webrtcQr.offerQr?.value || ''), (value) => {
      if (!value) didFocusOfferQr.value = false
    })

    watch(() => String(webrtcQr.answerQr?.value || ''), (value) => {
      if (!value) didFocusAnswerQr.value = false
    })

    onMounted(() => {
      webrtcQr.attach()
    })

    onBeforeUnmount(() => {
      webrtcQr.detach()
    })

    return {
      ...webrtcQr,
      goHandPage,
      goRealtimeGame,
      goHistory,
      requestHistory,
      startOfferScanner,
      scanOfferButtonRef,
      mainContentRef,
      offerQrImageRef,
      answerQrImageRef,
      onQrImageLoad
    }
  }
}
