<template>
  <ion-modal :is-open="isOpen" :cssClass="'share-modal'" @did-dismiss="onDismiss">
    <div style="padding:16px;display:flex;flex-direction:column;gap:10px;align-items:center">
      <div style="font-weight:700;text-align:center">Share this QR with other players</div>
      <img v-if="qrDataUrl" :src="qrDataUrl" alt="share-qr" style="width:320px;max-width:100%;display:block" />
      <div style="font-size:12px;word-break:break-all;text-align:center">{{ shareUrl }}</div>
      <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
        <ion-button size="small" color="medium" @click="generateQr">Refresh</ion-button>
        <ion-button size="small" color="primary" @click="copyLink">Copy Link</ion-button>
        <ion-button size="small" fill="clear" @click="close">Close</ion-button>
      </div>
    </div>
  </ion-modal>
</template>

<script lang="ts">
import { ref, onMounted, watch } from 'vue'
import { IonModal, IonButton } from '@ionic/vue'
import QRCode from 'qrcode'

export default {
  name: 'ShareModal',
  components: { IonModal, IonButton },
  props: {
    isOpen: { type: Boolean, default: false }
  },
  emits: ['update:isOpen'],
  setup(props, ctx: any) {
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

    function close() {
      ctx.emit('update:isOpen', false)
    }

    function onDismiss() {
      ctx.emit('update:isOpen', false)
    }

    watch(() => props.isOpen, (val) => {
      if (val) generateQr()
    })

    onMounted(() => {
      if (props.isOpen) void generateQr()
    })

    return { qrDataUrl, shareUrl, generateQr, copyLink, close, onDismiss }
  }
}
</script>

<style scoped>
/* Constrain modal size so it adapts to content rather than fullscreen */
:deep(.share-modal) {
  --max-width: 420px;
}

:deep(.share-modal .modal-wrapper) {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

:deep(.share-modal .modal-content) {
  width: 100%;
  max-width: 420px;
  margin: 0 auto;
  border-radius: 12px;
  overflow: visible;
}
</style>
