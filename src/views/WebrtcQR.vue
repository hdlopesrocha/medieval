<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>WebRTC QR Signaling</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <div style="margin-bottom:16px;padding:12px;border:1px solid rgba(0,0,0,0.06);border-radius:8px;background:#fff">
        <h3>Server URL QR</h3>
        <p>Generate a QR for a local IP and port so a phone can open the dev server.</p>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <ion-button @click="detectLocalIPs" color="primary">Detect Local IPs</ion-button>
          <ion-button @click="generateOriginQr" color="secondary">QR for Current Origin</ion-button>
        </div>
        <div v-if="detecting" style="margin-top:8px">Detecting local IPs…</div>
        <div v-if="localIps.length" style="margin-top:8px">
          <label style="display:block;margin-bottom:6px">Choose IP:</label>
          <div v-for="ip in localIps" :key="ip" style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <input type="radio" :value="ip" v-model="selectedIp" />
            <span>{{ ip }}</span>
          </div>
          <div style="margin-top:8px;display:flex;gap:8px;align-items:center">
            <input v-model="serverPort" placeholder="port" style="width:80px;padding:6px;border-radius:6px;border:1px solid #ddd" />
            <ion-button @click="generateServerQr" color="tertiary">Generate QR for IP:Port</ion-button>
          </div>
        </div>
        <div v-if="serverQr" style="margin-top:12px">
          <h4>Server QR</h4>
          <img :src="serverQr" style="max-width:220px;display:block" />
          <p style="margin-top:6px">URL:</p>
          <textarea rows="2" style="width:100%">{{ serverUrl }}</textarea>
        </div>
      </div>
      <div style="display:flex;gap:24px;flex-wrap:wrap">
        <div style="flex:1;min-width:300px;max-width:640px">
          <h3>Host (create offer)</h3>
          <ion-button @click="createOffer" color="primary">Create Offer & QR</ion-button>
          <div v-if="offerQr">
            <h4>Offer QR</h4>
            <img :src="offerQr" alt="offer-qr" style="max-width:320px;display:block"/>
            <p>Offer JSON:</p>
            <textarea rows="6" style="width:100%">{{ offerJson }}</textarea>
          </div>
          <div style="margin-top:8px">
            <ion-button color="tertiary" @click="pickFile('answer')">Upload/Take Answer Photo</ion-button>
            <input id="file-answer" type="file" accept="image/*" capture="environment" style="display:none" @change="(e)=>onFileInput(e,'answer')" />
            <div v-if="lastDecodedMode==='answer'" style="margin-top:8px">
              <div v-if="lastDecodedFound">
                <p>QR detected in uploaded image:</p>
                <textarea rows="3" style="width:100%">{{ lastDecoded }}</textarea>
                <div style="margin-top:6px">
                  <ion-button color="primary" @click="applyDecoded">Apply Detected Answer</ion-button>
                  <ion-button color="medium" @click="clearDecoded" style="margin-left:8px">Dismiss</ion-button>
                </div>
              </div>
              <div v-else style="margin-top:6px;color:#a00">{{ lastDecodedMessage }}</div>
            </div>
          </div>
          <div v-if="connectedHost">
            <p><strong>Data channel open</strong></p>
            <p>Messages:</p>
            <div style="background:#f6f6f8;padding:8px;border-radius:6px;max-height:160px;overflow:auto">{{ hostMessages.join('\n') }}</div>
          </div>
          <div style="margin-top:12px">
            <p>Paste answer JSON here (from remote) and click <em>Apply Answer</em>:</p>
            <textarea v-model="remoteAnswerText" rows="6" style="width:100%"></textarea>
            <ion-button @click="applyAnswer" style="margin-top:6px">Apply Answer</ion-button>
          </div>
        </div>

        <div style="flex:1;min-width:300px;max-width:640px">
          <h3>Client (accept offer)</h3>
          <p>Paste offer JSON (or scan QR) and click <em>Accept Offer</em> to create answer QR.</p>
          <textarea v-model="remoteOfferText" rows="6" style="width:100%"></textarea>
          <ion-button @click="acceptOffer" color="secondary" style="margin-top:6px">Accept Offer & Create Answer</ion-button>

          <div v-if="answerQr" style="margin-top:12px">
            <h4>Answer QR</h4>
            <img :src="answerQr" alt="answer-qr" style="max-width:320px;display:block"/>
            <p>Answer JSON:</p>
            <textarea rows="6" style="width:100%">{{ answerJson }}</textarea>
          </div>
          <div style="margin-top:8px">
            <ion-button color="tertiary" @click="pickFile('offer')">Upload/Take Offer Photo</ion-button>
            <input id="file-offer" type="file" accept="image/*" capture="environment" style="display:none" @change="(e)=>onFileInput(e,'offer')" />
            <div v-if="lastDecodedMode==='offer'" style="margin-top:8px">
              <div v-if="lastDecodedFound">
                <p>QR detected in uploaded image:</p>
                <textarea rows="3" style="width:100%">{{ lastDecoded }}</textarea>
                <div style="margin-top:6px">
                  <ion-button color="primary" @click="applyDecoded">Apply Detected Offer</ion-button>
                  <ion-button color="medium" @click="clearDecoded" style="margin-left:8px">Dismiss</ion-button>
                </div>
              </div>
              <div v-else style="margin-top:6px;color:#a00">{{ lastDecodedMessage }}</div>
            </div>
          </div>

          <div v-if="connectedClient" style="margin-top:12px">
            <p><strong>Data channel open (client)</strong></p>
            <div style="background:#f6f6f8;padding:8px;border-radius:6px;max-height:160px;overflow:auto">{{ clientMessages.join('\n') }}</div>
          </div>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script>
import { ref } from 'vue'
import QRCode from 'qrcode'
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButton } from '@ionic/vue'

export default {
  name: 'WebrtcQR',
  components: { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButton },
  setup() {
    const offerQr = ref('')
    const answerQr = ref('')
    const offerJson = ref('')
    const answerJson = ref('')
    const remoteOfferText = ref('')
    const remoteAnswerText = ref('')
    const hostMessages = ref([])
    const clientMessages = ref([])
    const connectedHost = ref(false)
    const connectedClient = ref(false)

    let hostPc = null
    let clientPc = null
    let hostDc = null
    let clientDc = null

    const stunServers = [
      { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun.stunprotocol.org:3478'] }
    ]

    const localIps = ref([])
    const selectedIp = ref('')
    const serverPort = ref(window.location.port || '8080')
    const serverQr = ref('')
    const serverUrl = ref('')
    const detecting = ref(false)
    const lastDecoded = ref('')
    const lastDecodedMode = ref('')
    const lastDecodedFound = ref(false)
    const lastDecodedMessage = ref('')

    async function detectLocalIPs(timeout = 2000) {
      detecting.value = true
      localIps.value = []
      try {
        const ips = new Set()
        const pc = new RTCPeerConnection({ iceServers: [] })
        pc.createDataChannel('detect')
        pc.onicecandidate = (e) => {
          if (!e.candidate || !e.candidate.candidate) return
          const s = e.candidate.candidate
          const m = s.match(/([0-9]{1,3}(?:\.[0-9]{1,3}){3})/)
          if (m && m[1]) ips.add(m[1])
        }
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        // wait for candidates
        await new Promise((res) => setTimeout(res, timeout))
        try { pc.close() } catch (e) {}
        const list = Array.from(ips)
        localIps.value = list
        if (list.length) selectedIp.value = list[0]
      } catch (e) {
        console.warn('detectLocalIPs failed', e)
      } finally {
        detecting.value = false
      }
    }

    async function generateServerQr() {
      if (!selectedIp.value) return alert('Select an IP first')
      const port = String(serverPort.value || '')
      const base = (import.meta.env.BASE_URL || '/')
      const path = base === '/' ? '' : base.replace(/\/$/, '')
      const url = `http://${selectedIp.value}${port ? ':' + port : ''}${path}`
      serverUrl.value = url
      serverQr.value = await QRCode.toDataURL(url)
    }

    async function generateOriginQr() {
      const url = window.location.origin + (import.meta.env.BASE_URL || '')
      serverUrl.value = url
      serverQr.value = await QRCode.toDataURL(url)
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
      hostDc.onmessage = (e) => { hostMessages.value.push('remote: ' + e.data) }

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      // wait briefly for ICE gathering (best-effort)
      await new Promise((res) => setTimeout(res, 700))

      const signalling = { type: 'offer', sdp: pc.localDescription.sdp, candidates }
      const text = JSON.stringify(signalling)
      offerJson.value = text
      offerQr.value = await QRCode.toDataURL(text)
    }

    async function acceptOffer() {
      if (!remoteOfferText.value) return alert('Paste offer JSON first')
      let obj
      try { obj = JSON.parse(remoteOfferText.value) } catch (e) { return alert('Invalid JSON') }
      const { pc, candidates } = await createPeer()
      clientPc = pc

      pc.ondatachannel = (ev) => {
        clientDc = ev.channel
        clientDc.onopen = () => { connectedClient.value = true }
        clientDc.onmessage = (e) => { clientMessages.value.push('remote: ' + e.data) }
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
      answerJson.value = text
      answerQr.value = await QRCode.toDataURL(text)
    }

    async function applyAnswer() {
      if (!remoteAnswerText.value) return alert('Paste answer JSON')
      if (!hostPc) return alert('No host peer (create offer first)')
      let obj
      try { obj = JSON.parse(remoteAnswerText.value) } catch (e) { return alert('Invalid JSON') }
      try {
        await hostPc.setRemoteDescription({ type: 'answer', sdp: obj.sdp })
      } catch (e) { console.warn(e) }
      if (Array.isArray(obj.candidates)) {
        for (const c of obj.candidates) {
          try { await hostPc.addIceCandidate(c) } catch (e) { }
        }
      }
      // optionally send a test message
      setTimeout(() => {
        if (hostDc && hostDc.readyState === 'open') hostDc.send('hello from host')
      }, 500)
    }

    

    async function onScanSuccess(decodedText, mode = 'offer') {
      // place decoded text into the correct textarea and auto-apply
      if (mode === 'offer') {
        remoteOfferText.value = decodedText
        await acceptOffer()
      } else if (mode === 'answer') {
        remoteAnswerText.value = decodedText
        await applyAnswer()
      }
    }


    // Pick file from phone (take photo or choose image) and decode QR from it
    async function pickFile(mode = 'offer') {
      try {
        const id = mode === 'offer' ? 'file-offer' : 'file-answer'
        const el = document.getElementById(id)
        if (el) el.click()
      } catch (e) {
        console.warn('pickFile failed', e)
      }
    }

    async function onFileInput(e, mode) {
      const files = e && e.target && e.target.files ? e.target.files : null
      if (!files || !files.length) return
      const file = files[0]
      await handleFileFile(file, mode)
      // clear input
      try { e.target.value = '' } catch (err) { }
    }

    async function handleFileFile(file, mode = 'offer') {
      try {
        const mod = await import('html5-qrcode')
        const Html5Qrcode = mod.Html5Qrcode || mod.default || mod
        // try scanFileV2, fall back to scanFile
        let decoded = null
        try {
          const res = await Html5Qrcode.scanFileV2(file, /* returnDetailedScanResult */ true)
          if (Array.isArray(res) && res.length) {
            decoded = res[0].decodedText || res[0]
          } else if (res && res.decodedText) decoded = res.decodedText
          else decoded = String(res)
        } catch (e) {
          try {
            const res2 = await Html5Qrcode.scanFile(file, true)
            decoded = Array.isArray(res2) && res2.length ? (res2[0].decodedText || res2[0]) : String(res2)
          } catch (err) {
            console.error('QR decode failed', err)
          }
        }
        if (!decoded) {
          lastDecoded.value = ''
          lastDecodedMode.value = mode
          lastDecodedFound.value = false
          lastDecodedMessage.value = 'No QR found in image'
          return
        }
        // store decoded result for user review, don't auto-apply
        lastDecoded.value = decoded
        lastDecodedMode.value = mode
        lastDecodedFound.value = true
        lastDecodedMessage.value = ''
      } catch (e) {
        console.error('handleFileFile error', e)
        alert('Failed to decode QR from file')
      }
    }

    async function applyDecoded() {
      if (!lastDecoded.value) return
      try {
        await onScanSuccess(lastDecoded.value, lastDecodedMode.value || 'offer')
      } catch (e) {
        console.error('applyDecoded error', e)
      }
      clearDecoded()
    }

    function clearDecoded() {
      lastDecoded.value = ''
      lastDecodedMode.value = ''
      lastDecodedFound.value = false
      lastDecodedMessage.value = ''
    }

    return {
      offerQr, answerQr, offerJson, answerJson, remoteOfferText, remoteAnswerText,
      createOffer, acceptOffer, applyAnswer,
      hostMessages, clientMessages, connectedHost, connectedClient,
      // server QR helpers
      detectLocalIPs, localIps, selectedIp, serverPort, serverQr, serverUrl, detecting, generateServerQr, generateOriginQr,
      // file upload helpers
      pickFile, onFileInput,
      // decoded analysis
      lastDecoded, lastDecodedMode, lastDecodedFound, lastDecodedMessage, applyDecoded, clearDecoded
    }
  }
}
</script>

<style scoped>
textarea { font-family: monospace }
</style>
