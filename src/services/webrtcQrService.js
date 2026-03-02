import { ref, nextTick, computed } from 'vue'
import QRCode from 'qrcode'
import { gzip, ungzip } from 'pako'
import { cube, cubeOutline, serverOutline, phonePortraitOutline } from 'ionicons/icons'
import { useGameStateService } from './gameStateService'
import deckService from './deckService'

let serviceInstance = null

function createWebrtcQrService() {
  const gameStateService = useGameStateService()
  const webrtcContext = 'webrtc'
  const clientDeckKey = 'client-deck'
  const clientHandKey = 'client-hand'
  const serverDeckKey = 'server-deck'
  const serverHandKey = 'server-hand'

  const offerQr = ref('')
  const offerUrlQr = ref('')
  const offerUrl = ref('')
  const answerQr = ref('')
  const offerJson = ref('')
  const answerJson = ref('')
  const sdpText = ref('')
  const outgoingText = ref('')
  const consoleLogger = ref([])
  const connectedHost = ref(false)
  const connectedClient = ref(false)
  const autoAcceptOffers = ref(true)
  const activeRole = ref('')
  const clientDeckCards = computed(() => gameStateService.getPlayerCards(clientDeckKey, webrtcContext))
  const clientHandCards = computed(() => gameStateService.getPlayerCards(clientHandKey, webrtcContext))
  const serverDeckCards = computed(() => gameStateService.getPlayerCards(serverDeckKey, webrtcContext))
  const serverHandCards = computed(() => gameStateService.getPlayerCards(serverHandKey, webrtcContext))

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
  let subscribers = 0

  function cardToPayload(card) {
    if (!card) return null
    if (typeof card.toJSON === 'function') {
      return card.toJSON()
    }
    return {
      imageUrl: card.imageUrl || '',
      title: card.title || '',
      description: card.description || '',
      effectDescription: card.effectDescription || '',
      attackPoints: Number(card.attackPoints || 0),
      defensePoints: Number(card.defensePoints || 0),
      type: card.type || 'SOLDIER',
      hp: Number(card.hp || 0),
      velocity: Number(card.velocity || 0),
      range: Number(card.range || 0),
      category: card.category || 'noble',
      subCategory: card.subCategory || 'swordShield',
      element: card.element === 'water' ? 'water' : 'earth'
    }
  }

  function shuffleCards(cards) {
    const copy = Array.isArray(cards) ? cards.slice() : []
    for (let index = copy.length - 1; index > 0; index--) {
      const swapIndex = Math.floor(Math.random() * (index + 1))
      const temp = copy[index]
      copy[index] = copy[swapIndex]
      copy[swapIndex] = temp
    }
    return copy
  }

  function sendInitialDeckToClient() {
    if (!hostDc || hostDc.readyState !== 'open') return
    gameStateService.ensureDeck(webrtcContext)
    let deck = gameStateService.getDeck(webrtcContext)
    if (!Array.isArray(deck) || !deck.length) {
      deck = deckService.createDeck()
    }
    const normalizedDeck = deck.map(cardToPayload).filter(Boolean)
    const shuffledDeck = shuffleCards(normalizedDeck)
    const handSize = Math.min(5, shuffledDeck.length)
    const hand = shuffledDeck.slice(0, handSize)
    const payload = {
      type: 'initial-deck',
      deck: shuffledDeck,
      hand
    }
    hostDc.send(JSON.stringify(payload))
    gameStateService.setDeck(shuffledDeck, webrtcContext)
    gameStateService.setPlayerCards(serverDeckKey, shuffledDeck, webrtcContext)
    gameStateService.setPlayerCards(serverHandKey, hand, webrtcContext)
    consoleLogger.value.push(`server: sent shuffled deck (${shuffledDeck.length}) and hand (${hand.length})`)
  }

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
    outgoingText.value = ''
    sdpText.value = ''
    stopOfferQrRotation()
    offerQr.value = ''
    offerQrParts.value = []
    offerQrPartIndex.value = 0
    offerJson.value = ''
    offerUrl.value = ''
    offerUrlQr.value = ''
    gameStateService.setDeck([], webrtcContext)
    gameStateService.setPlayerCards(clientDeckKey, [], webrtcContext)
    gameStateService.setPlayerCards(clientHandKey, [], webrtcContext)
    gameStateService.setPlayerCards(serverDeckKey, [], webrtcContext)
    gameStateService.setPlayerCards(serverHandKey, [], webrtcContext)
  }

  function resetClientState() {
    resetClientPeer()
    outgoingText.value = ''
    consoleLogger.value = []
    stopAnswerQrRotation()
    answerQr.value = ''
    answerQrParts.value = []
    answerQrPartIndex.value = 0
    answerJson.value = ''
    gameStateService.setDeck([], webrtcContext)
    gameStateService.setPlayerCards(clientDeckKey, [], webrtcContext)
    gameStateService.setPlayerCards(clientHandKey, [], webrtcContext)
    gameStateService.setPlayerCards(serverDeckKey, [], webrtcContext)
    gameStateService.setPlayerCards(serverHandKey, [], webrtcContext)
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

  async function createPeer() {
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
    hostDc.onopen = () => {
      connectedHost.value = true
      sendInitialDeckToClient()
    }
    hostDc.onmessage = (e) => {
      consoleLogger.value.push('message: ' + e.data)
    }

    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)

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
    connectedHost.value = false
    gameStateService.setDeck([], webrtcContext)
    gameStateService.setPlayerCards(clientDeckKey, [], webrtcContext)
    gameStateService.setPlayerCards(clientHandKey, [], webrtcContext)
    gameStateService.setPlayerCards(serverDeckKey, [], webrtcContext)
    gameStateService.setPlayerCards(serverHandKey, [], webrtcContext)
  }

  function normalizeSignalingInput(input) {
    let raw = String(input || '').trim()
    if (!raw) return ''

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
    console.log(message)
    if (!message) return alert('Paste offer JSON first')
    const normalizedOffer = normalizeSignalingInput(message)
    let obj
    try {
      obj = JSON.parse(normalizedOffer)
    } catch (e) {
      console.log(message)
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
        const raw = String(e?.data ?? '')
        try {
          const parsed = JSON.parse(raw)
          if (parsed?.type === 'initial-deck') {
            const receivedDeck = Array.isArray(parsed.deck) ? parsed.deck : []
            const receivedHand = Array.isArray(parsed.hand) ? parsed.hand : []
            gameStateService.setDeck(receivedDeck, webrtcContext)
            gameStateService.setPlayerCards(clientDeckKey, receivedDeck, webrtcContext)
            gameStateService.setPlayerCards(clientHandKey, receivedHand, webrtcContext)
            consoleLogger.value.push(`client: received initial deck (${receivedDeck.length}) and hand (${receivedHand.length})`)
            return
          }
        } catch (_err) {
          // non-JSON payloads are handled as plain messages
        }
        consoleLogger.value.push('data: ' + raw)
      }
    }

    await pc.setRemoteDescription({ type: 'offer', sdp: obj.sdp })
    if (Array.isArray(obj.candidates)) {
      for (const c of obj.candidates) {
        try { await pc.addIceCandidate(c) } catch (e) { }
      }
    }
    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)

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
    if (!hostPc) throw new Error('No host peer (create offer first)')
    const normalizedAnswer = normalizeSignalingInput(message)
    let obj
    try {
      obj = JSON.parse(normalizedAnswer)
    } catch (e) {
      throw new Error('Invalid answer payload')
    }
    if (!obj || obj.type !== 'answer' || typeof obj.sdp !== 'string' || !obj.sdp.startsWith('v=')) {
      throw new Error('Invalid answer payload structure. Expected answer SDP starting with v=.')
    }
    await hostPc.setRemoteDescription({ type: 'answer', sdp: obj.sdp })
    if (Array.isArray(obj.candidates)) {
      for (const c of obj.candidates) {
        try { await hostPc.addIceCandidate(c) } catch (e) { }
      }
    }
  }

  async function sendMessage(role = 'host') {
    const isHost = role === 'host'
    const textRef = outgoingText
    const text = String(textRef.value || '').trim()
    if (!text) return alert('Type a message first')

    if (isHost) {
      if (!hostDc || hostDc.readyState !== 'open') {
        return alert('Host data channel is not open yet. Complete signaling first.')
      }
      hostDc.send(text)
      consoleLogger.value.push('me: ' + text)
      textRef.value = ''
      return
    }

    if (!clientDc || clientDc.readyState !== 'open') {
      return alert('Client data channel is not open yet. Complete signaling first.')
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
    if (mode === 'offer') {
      await acceptOffer(decodedText)
    } else if (mode === 'answer') {
      await applyAnswer(decodedText)
    }
  }

  function attach() {
    subscribers += 1
    if (subscribers > 1) return

    preloadOfferFromUrl()
    window.addEventListener('hashchange', preloadOfferFromUrl)
    window.addEventListener('popstate', preloadOfferFromUrl)

    if (offerQrParts.value.length > 1) startOfferQrRotation()
    if (answerQrParts.value.length > 1) startAnswerQrRotation()
  }

  function detach() {
    subscribers = Math.max(0, subscribers - 1)
    if (subscribers > 0) return

    window.removeEventListener('hashchange', preloadOfferFromUrl)
    window.removeEventListener('popstate', preloadOfferFromUrl)
    stopOfferQrRotation()
    stopAnswerQrRotation()
    stopScanner()
  }

  return {
    offerQr, offerUrlQr, offerUrl, answerQr, offerJson, answerJson,
    sdpText,
    createOffer, acceptOffer, applyAnswer, sendMessage,
    consoleLogger, connectedHost, connectedClient,
    outgoingText,
    scanning, scanMode, scanStatus, scanError, startScanner, stopScanner,
    scannedParts, scannedPartsCount, scannedPartsExpected, resetScannedParts,
    offerQrParts, answerQrParts, offerQrPartIndex, answerQrPartIndex,
    cube, cubeOutline, serverOutline, phonePortraitOutline,
    clientDeckCards, clientHandCards, serverDeckCards, serverHandCards,
    activeRole, setRole,
    autoAcceptOffers,
    attach, detach
  }
}

export function useWebrtcQrService() {
  if (!serviceInstance) {
    serviceInstance = createWebrtcQrService()
  }
  return serviceInstance
}
