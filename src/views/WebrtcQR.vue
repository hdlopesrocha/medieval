<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>WebRTC QR Signaling</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <div style="display:flex;flex-direction:column;width:100%;gap:8px;align-items:stretch;flex-wrap:nowrap;margin-bottom:12px">
        <ion-button :color="activeRole === 'server' ? 'primary' : 'medium'" @click="setRole('server')" style="width:100%">Server</ion-button>
        <ion-button :color="activeRole === 'client' ? 'primary' : 'medium'" @click="setRole('client')" style="width:100%">Client</ion-button>
      </div>
      <p v-if="!activeRole" style="margin:0 0 12px 0">Choose a role to continue.</p>

      <template v-if="activeRole === 'server'">
        <div style="display:flex;flex-direction:column;width:100%;align-items:stretch">
          <h3>Server (create offer)</h3>
          <ion-button v-if="!connectedHost" @click="createOffer" color="primary" style="width:100%">Create Offer & QR</ion-button>
          <div v-if="!connectedHost && offerQr">
            <h4>Offer QR</h4>
            <img :src="offerQr" alt="offer-qr" style="width:100%;display:block"/>
            <p v-if="offerQrParts.length" style="margin:6px 0 6px 0">Part {{ offerQrPartIndex + 1 }}/{{ offerQrParts.length }}</p>
            <div v-if="offerQrParts.length" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">
              <div
                v-for="idx in offerQrParts.length"
                :key="`offer-part-${idx}`"
                :style="`min-width:52px;padding:6px 8px;border-radius:6px;text-align:center;border:1px solid ${offerQrPartIndex === (idx - 1) ? '#198754' : '#ced4da'};background:${offerQrPartIndex === (idx - 1) ? '#e9f7ef' : '#f8f9fa'};color:${offerQrPartIndex === (idx - 1) ? '#198754' : '#adb5bd'};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px`"
              >
                <ion-icon :icon="offerQrPartIndex === (idx - 1) ? cube : cubeOutline" style="font-size:18px"></ion-icon>
                <span style="font-size:11px;line-height:1">{{ idx }}</span>
              </div>
            </div>
          </div>
          <div v-if="!connectedHost" style="margin-top:8px">
            <ion-button color="tertiary" @click="startScanner('answer')" style="width:100%">Scan Answer QR (camera)</ion-button>
          </div>
          <div v-if="connectedHost">
            <p><strong>Data channel open</strong></p>
          </div>
          <div v-if="connectedHost" style="margin-top:10px">
            <p>Send message to peer:</p>
            <textarea v-model="hostOutgoingText" rows="2" style="width:100%"></textarea>
            <ion-button @click="connectAndSend(hostOutgoingText,'host')" style="margin-top:6px;width:100%">Connect + Send</ion-button>
          </div>
          <div v-if="!connectedHost" style="margin-top:12px">
            <p>Paste answer JSON here (from remote) and click <em>Apply Answer</em>:</p>
            <textarea v-model="sdpText" rows="4" style="width:100%;margin-top:6px"></textarea>
            <ion-button @click="applyAnswer(sdpText)" style="margin-top:6px;width:100%">Apply Answer</ion-button>
          </div>
        </div>
      </template>

      <template v-if="activeRole === 'client'">
        <div style="display:flex;flex-direction:column;width:100%;align-items:stretch">
          <h3>Client</h3>
          <div v-if="!connectedClient" style="margin-top:8px">
            <ion-button color="tertiary" @click="startScanner('offer')" style="width:100%">Scan Server Offer QR (camera)</ion-button>
          </div>

          <div v-if="!connectedClient && answerQr" style="margin-top:12px">
            <h4>Answer QR</h4>
            <img :src="answerQr" alt="answer-qr" style="width:100%;display:block"/>
            <p v-if="answerQrParts.length" style="margin:6px 0 6px 0">Part {{ answerQrPartIndex + 1 }}/{{ answerQrParts.length }}</p>
            <div v-if="answerQrParts.length" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">
              <div
                v-for="idx in answerQrParts.length"
                :key="`answer-part-${idx}`"
                :style="`min-width:52px;padding:6px 8px;border-radius:6px;text-align:center;border:1px solid ${answerQrPartIndex === (idx - 1) ? '#198754' : '#ced4da'};background:${answerQrPartIndex === (idx - 1) ? '#e9f7ef' : '#f8f9fa'};color:${answerQrPartIndex === (idx - 1) ? '#198754' : '#adb5bd'};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px`"
              >
                <ion-icon :icon="answerQrPartIndex === (idx - 1) ? cube : cubeOutline" style="font-size:18px"></ion-icon>
                <span style="font-size:11px;line-height:1">{{ idx }}</span>
              </div>
            </div>
          </div>

          <div v-if="connectedClient" style="margin-top:12px">
            <p><strong>Data channel open (client)</strong></p>
          </div>
          <div v-if="connectedClient" style="margin-top:10px">
            <p>Send message to peer:</p>
            <textarea v-model="clientOutgoingText" rows="2" style="width:100%"></textarea>
            <ion-button @click="connectAndSend(clientOutgoingText ,'client')" style="margin-top:6px;width:100%">Connect + Send</ion-button>
          </div>
        </div>
      </template>

      <div v-if="scanning && !((activeRole === 'server' && connectedHost) || (activeRole === 'client' && connectedClient))" style="display:flex;flex-direction:column;width:100%;padding:12px;border:1px solid rgba(0,0,0,0.12);border-radius:8px;background:#fff">
        <p style="margin:0 0 8px 0"><strong>Camera Scanner</strong> ({{ scanMode || 'qr' }})</p>
        <p style="margin:0 0 8px 0">Scanned parts: {{ scannedPartsCount }}/{{ scannedPartsExpected }}</p>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">
          <div
            v-for="idx in scannedPartsExpected"
            :key="idx"
            :style="`min-width:52px;padding:6px 8px;border-radius:6px;text-align:center;border:1px solid ${scannedParts[idx - 1] ? '#495057' : '#ced4da'};background:${scannedParts[idx - 1] ? '#e9ecef' : '#f8f9fa'};color:${scannedParts[idx - 1] ? '#212529' : '#adb5bd'};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px`"
          >
            <ion-icon :icon="scannedParts[idx - 1] ? cube : cubeOutline" style="font-size:18px"></ion-icon>
            <span style="font-size:11px;line-height:1">{{ idx }}</span>
          </div>
        </div>
        <div id="qr-reader" style="width:320px"></div>
        <p v-if="scanStatus" style="margin-top:8px">{{ scanStatus }}</p>
        <ion-button color="medium" @click="resetScannedParts" style="margin-top:6px;width:100%">Clear Scanned Parts</ion-button>
        <ion-button color="danger" @click="stopScanner" style="margin-top:6px;width:100%">Stop Scanner</ion-button>
      </div>
      <div v-if="scanError" style="display:flex;flex-direction:column;width:100%;margin-top:12px;padding:10px;border:1px solid #f5c2c7;border-radius:8px;background:#fff5f5;color:#842029">
        {{ scanError }}
      </div>
      <div style="display:flex;flex-direction:column;width:100%;margin-top:16px;padding:12px;border:1px solid rgba(0,0,0,0.12);border-radius:8px;background:#fff" v-if="consoleLogger.length">
        <p><strong>Logs</strong></p>
        <div v-for="(log, idx) in consoleLogger" :key="idx" style="width:100%;background:#f6f6f8;white-space:pre-wrap; padding:8px;border-radius:6px;max-height:160px;overflow:auto;font-size:12px;line-height:1.3">
          {{ log }}
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import QRCode from 'qrcode'
import { gzip, ungzip } from 'pako'
import { cube, cubeOutline } from 'ionicons/icons'
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon } from '@ionic/vue'

export default {
  name: 'WebrtcQR',
  components: { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon },
  setup() {
    const offerQr = ref('')
    const offerUrlQr = ref('')
    const offerUrl = ref('')
    const answerQr = ref('')
    const offerJson = ref('')
    const answerJson = ref('')
    const sdpText = ref('')
    const hostOutgoingText = ref('')
    const clientOutgoingText = ref('')
    const consoleLogger = ref([])
    const connectedHost = ref(false)
    const connectedClient = ref(false)
    const autoAcceptOffers = ref(true)
    const activeRole = ref('')

    let hostPc = null
    let clientPc = null
    let hostDc = null
    let clientDc = null

    const stunServers = [
      { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun.stunprotocol.org:3478'] }
    ]

    const scanning = ref(false)
    const scanMode = ref('')
    const scanStatus = ref('')
    const scanError = ref('')
    const scannedParts = ref([])
    const scannedPartsCount = ref(0)
    const scannedPartsExpected = ref(4)
    const offerQrParts = ref([])
    const answerQrParts = ref([])
    const offerQrPartIndex = ref(0)
    const answerQrPartIndex = ref(0)

    const qrPartsTotal = 4
    const qrPartMarker = 'qr-part-v1'

    let scannerInstance = null
    let scannedPartsPacketId = ''
    let offerQrRotationTimer = null
    let answerQrRotationTimer = null

    function stopOfferQrRotation() {
      if (offerQrRotationTimer) {
        clearInterval(offerQrRotationTimer)
      }
      offerQrRotationTimer = null
    }

    function stopAnswerQrRotation() {
      if (answerQrRotationTimer) {
        clearInterval(answerQrRotationTimer)
      }
      answerQrRotationTimer = null
    }

    function startOfferQrRotation() {
      stopOfferQrRotation()
      if (offerQrParts.value.length <= 1) return
      offerQrRotationTimer = setInterval(() => {
        offerQrPartIndex.value = (offerQrPartIndex.value + 1) % offerQrParts.value.length
        offerQr.value = offerQrParts.value[offerQrPartIndex.value] || ''
      }, 200)
    }

    function startAnswerQrRotation() {
      stopAnswerQrRotation()
      if (answerQrParts.value.length <= 1) return
      answerQrRotationTimer = setInterval(() => {
        answerQrPartIndex.value = (answerQrPartIndex.value + 1) % answerQrParts.value.length
        answerQr.value = answerQrParts.value[answerQrPartIndex.value] || ''
      }, 200)
    }

    function resetScannedParts(total = qrPartsTotal) {
      const safeTotal = Math.max(1, Number(total) || qrPartsTotal)
      scannedPartsExpected.value = safeTotal
      scannedParts.value = Array.from({ length: safeTotal }, () => '')
      scannedPartsCount.value = 0
      scannedPartsPacketId = ''
    }

    function splitPayloadIntoParts(payload, total = qrPartsTotal) {
      const text = String(payload || '')
      const safeTotal = Math.max(1, Number(total) || qrPartsTotal)
      const partSize = Math.max(1, Math.ceil(text.length / safeTotal))
      const parts = []
      for (let index = 0; index < safeTotal; index++) {
        const start = index * partSize
        const end = start + partSize
        parts.push(text.slice(start, end))
      }
      return parts
    }

    function buildQrPartPayloads(payload, kind) {
      const sequenceId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
      const parts = splitPayloadIntoParts(payload, qrPartsTotal)
      return parts.map((part, index) => JSON.stringify({
        qrm: qrPartMarker,
        id: sequenceId,
        kind,
        index,
        total: parts.length,
        data: part
      }))
    }

    function parseQrPartPayload(payload) {
      try {
        const parsed = JSON.parse(String(payload || ''))
        if (!parsed || parsed.qrm !== qrPartMarker) return null
        if (typeof parsed.id !== 'string' || !parsed.id) return null
        if (typeof parsed.kind !== 'string' || !parsed.kind) return null
        if (!Number.isInteger(parsed.index)) return null
        if (!Number.isInteger(parsed.total)) return null
        if (typeof parsed.data !== 'string') return null
        return parsed
      } catch (e) {
        return null
      }
    }

    function collectScannedPayload(payload, mode) {
      const part = parseQrPartPayload(payload)
      if (!part) {
        return { ready: true, payload: String(payload || ''), status: 'Single QR payload scanned.' }
      }

      if (part.kind !== mode) {
        return { ready: false, payload: '', status: `Scanned ${part.kind} part while expecting ${mode}.` }
      }

      const total = Math.max(1, Number(part.total) || qrPartsTotal)
      const index = Number(part.index)

      if (index < 0 || index >= total) {
        return { ready: false, payload: '', status: 'Invalid QR part index.' }
      }

      if (!scannedPartsPacketId || scannedPartsPacketId !== part.id || scannedPartsExpected.value !== total) {
        resetScannedParts(total)
        scannedPartsPacketId = part.id
      }

      if (!scannedParts.value[index]) {
        scannedParts.value[index] = part.data
      }

      scannedPartsCount.value = scannedParts.value.filter(Boolean).length

      if (scannedPartsCount.value < scannedPartsExpected.value) {
        return {
          ready: false,
          payload: '',
          status: `Scanned parts: ${scannedPartsCount.value}/${scannedPartsExpected.value}`
        }
      }

      const joined = scannedParts.value.join('')
      return { ready: true, payload: joined, status: `Scanned parts: ${scannedPartsCount.value}/${scannedPartsExpected.value}` }
    }

    function resetHostPeer() {
      try {
        if (hostDc) hostDc.close()
      } catch (e) { }
      try {
        if (hostPc) hostPc.close()
      } catch (e) { }
      hostDc = null
      hostPc = null
      connectedHost.value = false
    }

    function resetServerState() {
      resetHostPeer()
      hostOutgoingText.value = ''
      sdpText.value = ''
      stopOfferQrRotation()
      offerQr.value = ''
      offerQrParts.value = []
      offerQrPartIndex.value = 0
      offerJson.value = ''
      offerUrl.value = ''
      offerUrlQr.value = ''
    }

    function resetClientState() {
      resetClientPeer()
      clientOutgoingText.value = ''
      consoleLogger.value = []
      stopAnswerQrRotation()
      answerQr.value = ''
      answerQrParts.value = []
      answerQrPartIndex.value = 0
      answerJson.value = ''
    }

    function setRole(role) {
      if (activeRole.value === role) return
      if (activeRole.value === 'server') {
        resetServerState()
      } else if (activeRole.value === 'client') {
        resetClientState()
      }
      activeRole.value = role
      scanError.value = ''
      scanStatus.value = ''
      stopScanner()

      if (role === 'client' && autoAcceptOffers.value) {
        preloadOfferFromUrl()
      }
    }

    async function createPeer(options = {}) {
      const pc = new RTCPeerConnection({ iceServers: stunServers })
      const candidates = []
      pc.addEventListener('icecandidate', (e) => {
        if (e.candidate) candidates.push(e.candidate)
      })
      return { pc, candidates }
    }

    async function createOffer() {
      const { pc, candidates } = await createPeer()
      hostPc = pc
      hostDc = pc.createDataChannel('data')
      hostDc.onopen = () => { connectedHost.value = true }
      hostDc.onmessage = (e) => { 
        consoleLogger.value.push('message: ' + e.data) 
      }

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      // wait briefly for ICE gathering (best-effort)
      await new Promise((res) => setTimeout(res, 700))

      const signalling = { type: 'offer', sdp: pc.localDescription.sdp, candidates }
      const text = JSON.stringify(signalling)
      const qrPayload = gzipToToken(text)
      const qrPayloadParts = buildQrPartPayloads(qrPayload, 'offer')
      const qrImages = await Promise.all(qrPayloadParts.map((partPayload) => QRCode.toDataURL(partPayload)))
      consoleLogger.value.push('createOffer: ' + text)
      offerJson.value = text
      offerQrParts.value = qrImages
      offerQrPartIndex.value = 0
      offerQr.value = offerQrParts.value[0] || ''
      startOfferQrRotation()
      offerUrl.value = buildOfferUrl(qrPayload)
      offerUrlQr.value = await QRCode.toDataURL(offerUrl.value)
    }

    function buildOfferUrl(offerText) {
      const current = new URL(window.location.href)
      const base = `${current.origin}${current.pathname}`
      const currentHashPath = (current.hash || '#/webrtc').split('?')[0] || '#/webrtc'
      const encodedOffer = encodeURIComponent(offerText)
      return `${base}${currentHashPath}?offer=${encodedOffer}`
    }

    function bytesToBase64Url(bytes) {
      let binary = ''
      const chunkSize = 0x8000
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize)
        binary += String.fromCharCode(...chunk)
      }
      return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
    }

    function base64UrlToBytes(value) {
      const normalized = String(value || '').replace(/-/g, '+').replace(/_/g, '/')
      const padLength = (4 - (normalized.length % 4)) % 4
      const padded = normalized + '='.repeat(padLength)
      const binary = atob(padded)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i)
      }
      return bytes
    }

    function gzipToToken(text) {
      const encoded = new TextEncoder().encode(String(text))
      const compressed = gzip(encoded)
      return 'gz:' + bytesToBase64Url(compressed)
    }

    function extractGzipToken(value) {
      const raw = String(value || '').trim()
      if (!raw) return ''
      if (raw.startsWith('gz:')) return raw
      const match = raw.match(/gz:[A-Za-z0-9_-]+/)
      return match ? match[0] : ''
    }

    function gunzipFromToken(token) {
      const rawToken = extractGzipToken(token)
      if (!rawToken) return String(token || '').trim()
      const compactToken = rawToken.replace(/\s+/g, '')
      if (!compactToken.startsWith('gz:')) return compactToken
      const compressed = base64UrlToBytes(compactToken.slice(3))
      return String(ungzip(compressed, { to: 'string' }))
    }



    function extractOfferFromUrl() {
      const directSearch = new URLSearchParams(window.location.search).get('offer')
      if (directSearch) return directSearch

      const hash = window.location.hash || ''
      const qIndex = hash.indexOf('?')
      if (qIndex < 0) return ''
      const hashQuery = hash.slice(qIndex + 1)
      return new URLSearchParams(hashQuery).get('offer') || ''
    }

    function preloadOfferFromUrl() {
      const offerFromUrl = extractOfferFromUrl()
      if (!offerFromUrl) return
      if (autoAcceptOffers.value) {
        acceptOffer(offerFromUrl)
      }
    }

    function resetClientPeer() {
      try {
        if (clientDc) clientDc.close()
      } catch (e) { }
      try {
        if (clientPc) clientPc.close()
      } catch (e) { }
      clientDc = null
      clientPc = null
      connectedClient.value = false
    }

    function normalizeSignalingInput(input) {
      let raw = String(input || '').trim()
      if (!raw) return ''

      // If a URL was pasted/scanned, try to extract ?offer=... from search/hash.
      if (!raw.startsWith('{')) {
        try {
          const parsed = new URL(raw)
          const fromSearch = new URLSearchParams(parsed.search).get('offer')
          if (fromSearch) raw = fromSearch
          else {
            const hash = parsed.hash || ''
            const qIndex = hash.indexOf('?')
            if (qIndex >= 0) {
              const fromHash = new URLSearchParams(hash.slice(qIndex + 1)).get('offer')
              if (fromHash) raw = fromHash
            }
          }
        } catch (e) {
          // not a URL, continue
        }
      }

      // Some share channels can double-encode payloads.
      for (let i = 0; i < 2 && !raw.startsWith('{'); i++) {
        try {
          raw = decodeURIComponent(raw)
        } catch (e) {
          break
        }
      }

      const gzipToken = extractGzipToken(raw)
      if (gzipToken) {
        try {
          raw = gunzipFromToken(gzipToken)
        } catch (e) {
          // keep raw value for downstream validation/error
        }
      }

      // If extra text is wrapped around JSON, keep only JSON object region.
      if (!raw.startsWith('{')) {
        const start = raw.indexOf('{')
        const end = raw.lastIndexOf('}')
        if (start >= 0 && end > start) {
          raw = raw.slice(start, end + 1)
        }
      }

      return raw.trim()
    }

    async function acceptOffer(message) {
      console.log(message);
      if (!message) return alert('Paste offer JSON first')
      const normalizedOffer = normalizeSignalingInput(message)
      let obj
      try {
        obj = JSON.parse(normalizedOffer)
      } catch (e) {
        console.log(message);
        return alert('Invalid offer payload. Paste raw offer JSON, a valid offer URL, or a gzip-encoded offer token.')
      }
      if (!obj || obj.type !== 'offer' || typeof obj.sdp !== 'string' || !obj.sdp.startsWith('v=')) {
        return alert('Invalid offer payload structure. Expected offer SDP starting with v=.')
      }
      await resetClientPeer()
      const { pc, candidates } = await createPeer()
      clientPc = pc

      pc.ondatachannel = (ev) => {
        clientDc = ev.channel
        clientDc.onopen = () => { connectedClient.value = true }
        clientDc.onmessage = (e) => { 
          consoleLogger.value.push('data: ' + e.data.toString()) 
        }
      }

      await pc.setRemoteDescription({ type: 'offer', sdp: obj.sdp })
      // add any remote ICE candidates from offer
      if (Array.isArray(obj.candidates)) {
        for (const c of obj.candidates) {
          try { await pc.addIceCandidate(c) } catch (e) { }
        }
      }
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)

      // wait briefly for ICE
      await new Promise((res) => setTimeout(res, 700))

      const signalling = { type: 'answer', sdp: pc.localDescription.sdp, candidates }
      const text = JSON.stringify(signalling)
      consoleLogger.value.push('acceptOffer: ' + text)
      const qrPayload = gzipToToken(text)
      const qrPayloadParts = buildQrPartPayloads(qrPayload, 'answer')
      const qrImages = await Promise.all(qrPayloadParts.map((partPayload) => QRCode.toDataURL(partPayload)))
      answerJson.value = text
      answerQrParts.value = qrImages
      answerQrPartIndex.value = 0
      answerQr.value = answerQrParts.value[0] || ''
      startAnswerQrRotation()
    }

    async function applyAnswer(message) {
      if (!hostPc) return alert('No host peer (create offer first)')
      const normalizedAnswer = normalizeSignalingInput(message)
      let obj
      try { obj = JSON.parse(normalizedAnswer) } catch (e) { return alert('Invalid answer payload') }
      if (!obj || obj.type !== 'answer' || typeof obj.sdp !== 'string' || !obj.sdp.startsWith('v=')) {
        return alert('Invalid answer payload structure. Expected answer SDP starting with v=.')
      }
      try {
        await hostPc.setRemoteDescription({ type: 'answer', sdp: obj.sdp })
      } catch (e) { console.warn(e) }
      if (Array.isArray(obj.candidates)) {
        for (const c of obj.candidates) {
          try { await hostPc.addIceCandidate(c) } catch (e) { }
        }
      }
    }

    async function connectAndSend(message, role = 'host') {
      const isHost = role === 'host'
      const textRef = isHost ? hostOutgoingText : clientOutgoingText
      const text = String(textRef.value || '').trim()
      if (!text) return alert('Type a message first')

      if (isHost) {
        if ((!hostDc || hostDc.readyState !== 'open') && message) {
          await applyAnswer(message)
          await new Promise((resolve) => setTimeout(resolve, 250))
        }
        if (!hostDc || hostDc.readyState !== 'open') {
          return alert('Host data channel is not open yet. Apply answer first.')
        }
        hostDc.send(text)
        textRef.value = ''
        return
      }

      if ((!clientDc || clientDc.readyState !== 'open') && !clientPc) {
        await acceptOffer(message)
        await new Promise((resolve) => setTimeout(resolve, 250))
      }
      if (!clientDc || clientDc.readyState !== 'open') {
        return alert('Client data channel is not open yet. Accept offer first.')
      }
      clientDc.send(text)
      consoleLogger.value.push('me: ' + text)
      textRef.value = ''
    }

    function extractOfferPayloadFromText(decodedText) {
      const raw = String(decodedText || '').trim()
      if (!raw) return ''
      if (raw.startsWith('{')) return raw
      try {
        const u = new URL(raw)
        const fromSearch = new URLSearchParams(u.search).get('offer')
        if (fromSearch) return fromSearch
        const hash = u.hash || ''
        const qIndex = hash.indexOf('?')
        if (qIndex >= 0) {
          const fromHash = new URLSearchParams(hash.slice(qIndex + 1)).get('offer')
          if (fromHash) return fromHash
        }
      } catch (e) {
        // not a URL, ignore
      }
      return raw
    }

    async function startScanner(mode = 'answer') {
      await stopScanner()
      scanning.value = true
      scanMode.value = mode
      scanStatus.value = 'Opening camera...'
      scanError.value = ''
      resetScannedParts(qrPartsTotal)
      try {
        const host = String(window.location.hostname || '')
        const isLocalHost = /^(localhost|127\.0\.0\.1|::1)$/.test(host)
        if (!window.isSecureContext && !isLocalHost) {
          throw new Error('Camera access requires HTTPS (or localhost). Open this page with https:// or on localhost.')
        }

        await nextTick()
        const mod = await import('html5-qrcode')
        const Html5Qrcode = mod.Html5Qrcode || mod.default || mod

        const readerEl = document.getElementById('qr-reader')
        if (!readerEl) throw new Error('Scanner container not ready')

        scannerInstance = new Html5Qrcode('qr-reader')

        const configs = []
        try {
          const cameras = await Html5Qrcode.getCameras()
          if (Array.isArray(cameras) && cameras.length) {
            const preferred = cameras.find((c) => /back|rear|environment/i.test(String(c.label || '')))
            if (preferred?.id) configs.push(preferred.id)
            for (const cam of cameras) {
              if (cam?.id && cam.id !== preferred?.id) configs.push(cam.id)
            }
          }
        } catch (e) {
          // ignore and continue with facingMode fallbacks
        }

        configs.push({ facingMode: { exact: 'environment' } })
        configs.push({ facingMode: 'environment' })
        configs.push({ facingMode: 'user' })

        let started = false
        let applied = false
        let applying = false
        let lastErr = null

        const onSuccess = async (decodedText) => {
          if (applied || applying) return
          try {
            scanError.value = ''
            const payload = mode === 'offer' ? extractOfferPayloadFromText(decodedText) : String(decodedText || '')
            if (!payload) throw new Error('Empty QR payload')
            const scanned = collectScannedPayload(payload, mode)
            scanStatus.value = scanned.status
            if (!scanned.ready) return
            applying = true
            scanStatus.value = 'All parts scanned. Applying...'
            await onScanSuccess(scanned.payload, mode)
            applied = true
            scanStatus.value = 'Applied.'
            await stopScanner()
          } catch (e) {
            console.error('Camera QR apply failed', e)
            scanError.value = 'Scanned QR could not be applied. Ensure you are scanning an Offer QR on client or an Answer QR on host.'
            applying = false
          }
        }

        const onError = () => {
          // ignore per-frame decode errors
        }

        for (const cameraConfig of configs) {
          try {
            await scannerInstance.start(cameraConfig, { fps: 10 }, onSuccess, onError)
            started = true
            scanStatus.value = 'Point camera at QR code'
            break
          } catch (e) {
            lastErr = e
          }
        }

        if (!started) throw lastErr || new Error('Unable to start camera scanner')
      } catch (e) {
        console.error('startScanner error', e)
        const msg = String(e && (e.message || e.name || e))
        if (/NotAllowedError|Permission denied|PermissionDismissed/i.test(msg)) {
          scanError.value = 'Camera permission denied. Allow camera access in browser settings and retry.'
        } else if (/NotFoundError|no camera|No Cameras/i.test(msg)) {
          scanError.value = 'No camera device was found.'
        } else if (/secure|https|insecure/i.test(msg)) {
          scanError.value = 'Camera requires HTTPS (or localhost). LAN http URLs may be blocked by the browser.'
        } else {
          scanError.value = `Unable to start camera scanner: ${msg}`
        }
        await stopScanner()
      }
    }

    async function stopScanner() {
      if (scannerInstance) {
        try {
          await scannerInstance.stop()
        } catch (e) {
          // ignore stop errors
        }
        try {
          await scannerInstance.clear()
        } catch (e) {
          // ignore clear errors
        }
      }
      scannerInstance = null
      scanning.value = false
      scanMode.value = ''
      scanStatus.value = ''
    }

    

    async function onScanSuccess(decodedText, mode = 'offer') {
      sdpText.value = String(decodedText).trim()
      // place decoded text into the correct textarea and auto-apply
      if (mode === 'offer') {
        await acceptOffer(decodedText)
      } else if (mode === 'answer') {
        await applyAnswer(decodedText)
      }
    }


    onMounted(() => {
      preloadOfferFromUrl()
      window.addEventListener('hashchange', preloadOfferFromUrl)
      window.addEventListener('popstate', preloadOfferFromUrl)
    })

    onBeforeUnmount(() => {
      window.removeEventListener('hashchange', preloadOfferFromUrl)
      window.removeEventListener('popstate', preloadOfferFromUrl)
      stopOfferQrRotation()
      stopAnswerQrRotation()
      stopScanner()
    })

    return {
      offerQr, offerUrlQr, offerUrl, answerQr, offerJson, answerJson,
      sdpText,
      createOffer, acceptOffer, applyAnswer, connectAndSend,
      consoleLogger, connectedHost, connectedClient,
      hostOutgoingText, clientOutgoingText,
      scanning, scanMode, scanStatus, scanError, startScanner, stopScanner,
      scannedParts, scannedPartsCount, scannedPartsExpected, resetScannedParts,
      offerQrParts, answerQrParts, offerQrPartIndex, answerQrPartIndex,
      cube, cubeOutline,
      activeRole, setRole,
      autoAcceptOffers
    }
  }
}
</script>

<style scoped>
textarea { font-family: monospace }
</style>
