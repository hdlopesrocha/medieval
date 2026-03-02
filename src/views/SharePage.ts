import { ref, onMounted } from 'vue'
import { IonPage, IonContent, IonButton } from '@ionic/vue'
import QRCode from 'qrcode'

export default {
  name: 'SharePage',
  components: { IonPage, IonContent, IonButton },
  setup() {
    const qrDataUrl = ref('')
    const shareUrl = ref('')

    function buildShareUrl() {
      try {
        const base = `${window.location.origin}${window.location.pathname}${window.location.search}`
        shareUrl.value = base
      } catch (_e) {
        shareUrl.value = ''
      }
    }

    async function generateQr() {
      buildShareUrl()
      try {
        qrDataUrl.value = await QRCode.toDataURL(shareUrl.value, {
          width: 320,
          margin: 2,
          errorCorrectionLevel: 'M'
        })
      } catch (_e) {
        qrDataUrl.value = ''
      }
    }

    async function copyLink() {
      if (!shareUrl.value) return
      try {
        await navigator.clipboard.writeText(shareUrl.value)
      } catch (_e) {
        // ignore
      }
    }

    onMounted(() => {
      void generateQr()
    })

    return {
      qrDataUrl,
      shareUrl,
      generateQr,
      copyLink
    }
  }
}
