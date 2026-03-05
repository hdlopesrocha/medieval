import { ref, nextTick, computed } from 'vue'
import QRCode from 'qrcode'
import { gzip, ungzip } from 'pako'
import { cube, cubeOutline, serverOutline, phonePortraitOutline } from 'ionicons/icons'
// Removed: useGameStateService is no longer defined or needed.
import deckService from './deckService'
import engine from '../game/engineInstance'
import gameStateService from './gameStateService'
import { GameWorkflowState } from '../models/GameWorkflowState'
import eventService from './eventService'
import { GameContext } from '../models/GameContext'

let serviceInstance = null

function createWebrtcQrService() {
  // Removed: useGameStateService is no longer defined or needed.
  const webrtcContext = 'webrtc'
  const clientHandKey = 1
  const serverHandKey = 0

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
  const clientDeckCards = computed(() => gameContext.deck)
  const clientHandCards = computed(() => gameContext.getPlayerCards(clientHandKey, webrtcContext))
  const serverDeckCards = computed(() => gameContext.deck)
  const serverHandCards = computed(() => gameContext.getPlayerCards(serverHandKey, webrtcContext))
  const isRealtimeGameActive = computed(() => {
    const role = String(activeRole.value || '')
    const connected = Boolean(connectedHost.value || connectedClient.value)
    return connected && (role === 'server' || role === 'client')
  })
  
    // Listen for engine state changes and sync game state (only gameContext and workflow)
    try {
      eventService.on('engine:stateChange', (eng) => {
        // Only sync if a realtime game is active and host/client is connected
        if (!isRealtimeGameActive.value) return
        // Only sync if data channel is open
        if (connectedHost.value && dataChannel && dataChannel.readyState === 'open') {
          // Send only gameContext and workflow (not deck)
          const wf = new GameWorkflowState(engine.gameWorkflow) || {}
          const ctx = new GameContext(engine.gameContext) || {}
          ctx.playerId = 1 // Remap playerId to client perspective
          const payload = { gameContext: ctx, workflow: wf }
          dataChannel.send(JSON.stringify({ 
            type: 'game-state', 
            reason: 'event', 
            state: payload 
          }))
          consoleLogger.value.push('server: event-driven game state sync')
        }
      })
    } catch (e) { console.warn('webrtcQrService: failed to subscribe to engine events', e) }
  const lastGameError = ref('')

  let peerConnection = null
  let dataChannel = null

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

  function handleDataChannelMessage(e) {
    const raw = String(e?.data ?? '')
    let parsed = null
    try {
      parsed = JSON.parse(raw)
    } catch (_err) {
      consoleLogger.value.push('data: ' + raw)
      return
    }

    if (parsed?.type === 'game-state') {
      console.log('Received game state update from peer:', parsed)
      engine.importState(parsed.state)
      return
    }
    consoleLogger.value.push('data: ' + raw)
  }

  // Build a minimal payload containing only the three objects we want to send
  // over the data channel: `gameContext`, `workflow` and `deck`.
  // `targetPlayerId` should be the id the receiver expects (e.g. 1 for client, 0 for server).
  function buildNormalizedState(targetPlayerId) {
    const wf = engine.gameWorkflow || {}
    const ctx = engine.gameContext || {}
    const d = engine.allCards
    ctx.playerId = targetPlayerId 

    // Prepare a compact deck payload. If `engine.allCards` exposes a `cards`
    // map (created by the Deck model), send that; otherwise send the whole
    // `allCards` object as a fallback.
    return {
      gameContext: ctx,
      workflow: wf,
      deck: d
    }
  }

  function syncGameState(reason = 'sync', playerId) {
    if (!dataChannel || dataChannel.readyState !== 'open') return false
    const snapshot = buildNormalizedState(playerId)
    dataChannel.send(JSON.stringify({ 
      type: 'game-state', 
      reason, 
      state: snapshot 
    }))
    consoleLogger.value.push(`server: synced game state (${reason})`)
    return true
  }

  

  function requestGameAction(action, payload = {}) {
    if (!dataChannel || dataChannel.readyState !== 'open') {
      lastGameError.value = 'client channel not open'
      consoleLogger.value.push('client: action request failed (channel closed)')
      return false
    }
    dataChannel.send(JSON.stringify({ type: 'game-action', action: String(action || ''), payload }))
    consoleLogger.value.push('client: requested action ' + String(action || ''))
    return true
  }

  function requestStartGame() {
    return requestGameAction('startGame', {})
  }

  function requestHistoryFromServer() {
    if (!dataChannel || dataChannel.readyState !== 'open') {
      consoleLogger.value.push('client: history request skipped (data channel not open)')
      return false
    }
    dataChannel.send(JSON.stringify({ type: 'history-request' }))
    consoleLogger.value.push('client: requested history')
    return true
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

  function splitBytesIntoParts(bytes, total = qrPartsTotal) {
    const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(Array.from(bytes || []))
    const safeTotal = Math.max(1, Number(total) || qrPartsTotal)
    const partSize = Math.max(1, Math.ceil(arr.length / safeTotal))
    const parts = []
    for (let index = 0; index < safeTotal; index++) {
      const start = index * partSize
      const end = Math.min(arr.length, start + partSize)
      parts.push(arr.slice(start, end))
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

  // Build binary QR payloads: compress the provided text and split the raw
  // gzipped bytes into parts. Each part is a Buffer containing a JSON header
  // followed by a 0x1E separator and the raw bytes. This enables QR binary
  // encoding which is more compact than text-mode encodings.
  function buildPartBinaryPayloads(text, kind) {
    const sequenceId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    let encoded
    if (text instanceof Uint8Array) {
      encoded = text
    } else if (typeof Buffer !== 'undefined' && Buffer.isBuffer(text)) {
      encoded = new Uint8Array(text)
    } else if (text instanceof ArrayBuffer) {
      encoded = new Uint8Array(text)
    } else {
      encoded = new TextEncoder().encode(String(text || ''))
    }
    const compressed = gzip(encoded)
    const parts = splitBytesIntoParts(compressed, qrPartsTotal)
    return parts.map((chunk, index) => {
      const header = JSON.stringify({ qrm: qrPartMarker, id: sequenceId, kind, index, total: parts.length })
      const sep = new Uint8Array([0x1E])
      const packet = new Uint8Array(header.length + 1 + chunk.length)
      for (let i = 0; i < header.length; i++) packet[i] = header.charCodeAt(i)
      packet[header.length] = sep[0]
      packet.set(chunk, header.length + 1)
      return packet
    })
  }

  function parseQrPartPayload(payload) {
    try {
      const raw = String(payload || '')
      try {
        const parsed = JSON.parse(raw)
        if (!parsed || parsed.qrm !== qrPartMarker) return null
        if (typeof parsed.id !== 'string' || !parsed.id) return null
        if (typeof parsed.kind !== 'string' || !parsed.kind) return null
        if (!Number.isInteger(parsed.index)) return null
        if (!Number.isInteger(parsed.total)) return null
        if (typeof parsed.data !== 'string') return null
        return { ...parsed, __binary: false }
      } catch (_e) {
        // Attempt to locate a JSON header inside a potentially binary payload
        const start = raw.indexOf('{')
        const end = raw.indexOf('}')
        if (start >= 0 && end > start) {
          const headerText = raw.slice(start, end + 1)
          try {
            const parsed = JSON.parse(headerText)
            if (!parsed || parsed.qrm !== qrPartMarker) return null
            // extract binary chunk following the header + separator
            const remainder = raw.slice(end + 1)
            // Convert remainder to bytes (assumes 1:1 mapping)
            const bytes = new Uint8Array(remainder.length)
            for (let i = 0; i < remainder.length; i++) bytes[i] = remainder.charCodeAt(i) & 0xFF
            return { ...parsed, __binary: true, __chunkBytes: bytes }
          } catch (_e2) {
            return null
          }
        }
        return null
      }
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
      if (part.__binary) {
        scannedParts.value[index] = { __binary: true, bytes: part.__chunkBytes }
      } else {
        scannedParts.value[index] = part.data
      }
    }

    scannedPartsCount.value = scannedParts.value.filter(Boolean).length

    if (scannedPartsCount.value < scannedPartsExpected.value) {
      return {
        ready: false,
        payload: '',
        status: `Scanned parts: ${scannedPartsCount.value}/${scannedPartsExpected.value}`
      }
    }

    // Reconstruct payload: support binary parts (concatenate bytes and gunzip) or
    const first = scannedParts.value[0]
    if (first && first.__binary) {
      // concatenate bytes
      let length = 0
      for (const p of scannedParts.value) length += (p?.bytes?.length || 0)
      const combined = new Uint8Array(length)
      let offset = 0
      for (const p of scannedParts.value) {
        const b = p.bytes || new Uint8Array(0)
        combined.set(b, offset)
        offset += b.length
      }
      try {
        const decompressed = ungzip(combined, { to: 'string' })
        return { ready: true, payload: String(decompressed || ''), status: `Scanned parts: ${scannedPartsCount.value}/${scannedPartsExpected.value}` }
      } catch (e) {
        return { ready: false, payload: '', status: 'Failed to decompress scanned binary parts.' }
      }
    }

    const joined = scannedParts.value.join('')
    return { ready: true, payload: joined, status: `Scanned parts: ${scannedPartsCount.value}/${scannedPartsExpected.value}` }
  }

  function resetHostPeer() {
    try {
      if (dataChannel) dataChannel.close()
    } catch (e) { }
    try {
      if (peerConnection) peerConnection.close()
    } catch (e) { }
    dataChannel = null
    peerConnection = null
    connectedHost.value = false
  }

  function resetServerState() {
    resetHostPeer()
    outgoingText.value = ''
    sdpText.value = ''
    stopOfferQrRotation()
    engine.clearStoredState()

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
    try { engine.saveState() } catch (e) {}
    try { engine.loadState() } catch (e) {}
    try {
      const wf = engine.gameWorkflow || new GameWorkflowState()
      Object.assign(wf, { playerId: 1 })
      if (typeof wf.appendHistory === 'function') {
        const castleMap = (Array.isArray(engine.players) ? engine.players : []).reduce((m, p) => { try { m[String(p.id)] = Number(p.castleHp ?? 0) } catch (_) {} return m }, {})
        wf.appendHistory({ action: 'resetClientState', activePlayerId: 1, round: 0, gameOver: false, deckCount: 0, cardsInPlayCount: 0, castleHpByPlayer: castleMap })
      }
      try { engine.saveState() } catch (e) {}
    } catch (e) {}
    try { engine.saveState() } catch (e) {}
    try { engine.saveState() } catch (e) {}
    try { engine.saveState() } catch (e) {}
    try { engine.saveState() } catch (e) {}
  }

  function setRole(role) {
    if (activeRole.value === role) return
    if (activeRole.value === 'server') {
      resetServerState()
    } else if (activeRole.value === 'client') {
      resetClientState()
    } else {
      resetServerState()
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
    peerConnection = pc
    return { pc, candidates }
  }

  async function createOffer() {
    const { pc, candidates } = await createPeer()
    dataChannel = pc.createDataChannel('data')
    dataChannel.onopen = () => {
      connectedHost.value = true
      if(activeRole.value === 'server'){  
        syncGameState('connected', 1)
      }
    }
    dataChannel.onmessage = handleDataChannelMessage
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)

    await new Promise((res) => setTimeout(res, 700))

    const signalling = { type: 'offer', sdp: pc.localDescription.sdp, candidates }
    const text = JSON.stringify(signalling)
    // Attempt binary QR generation (more compact). If the QR library rejects
    // the binary input in this environment, fall back to text-mode gz tokens.
    let qrImages
      let qrPayload
    try {
      const payloadBuffers = buildPartBinaryPayloads(text, 'offer')
      qrImages = await Promise.all(payloadBuffers.map(async (partBuf) => {
        const input = (typeof Buffer !== 'undefined' && Buffer.from) ? Buffer.from(partBuf) : partBuf
        return await QRCode.toDataURL(input)
      }))
    } catch (err) {
        qrPayload = gzipToToken(text)
      const qrPayloadParts = buildQrPartPayloads(qrPayload, 'offer')
      qrImages = await Promise.all(qrPayloadParts.map((partPayload) => QRCode.toDataURL(partPayload)))
    }
    consoleLogger.value.push('createOffer: ' + text)
    offerJson.value = text
    offerQrParts.value = qrImages
    offerQrPartIndex.value = 0
    offerQr.value = offerQrParts.value[0] || ''
    startOfferQrRotation()
      offerUrl.value = buildOfferUrl(qrPayload || text)
    offerUrlQr.value = await QRCode.toDataURL(offerUrl.value)
  }

  function buildOfferUrl(offerText) {
    const current = new URL(window.location.href)
    const base = `${current.origin}${current.pathname}`
    const currentHashPath = (current.hash || '#/webrtc').split('?')[0] || '#/webrtc'
    const encodedOffer = encodeURIComponent(offerText)
    return `${base}${currentHashPath}?offer=${encodedOffer}`
  }

  const base91Alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!#$%&()*+,./:;<=>?@[]^_`{|}~"'
  const base91DecodeTable = (() => {
    const table = Object.create(null)
    for (let index = 0; index < base91Alphabet.length; index++) {
      table[base91Alphabet[index]] = index
    }
    return table
  })()

  function bytesToBase91(bytes) {
    let output = ''
    let buffer = 0
    let bitCount = 0

    for (let index = 0; index < bytes.length; index++) {
      buffer |= bytes[index] << bitCount
      bitCount += 8
      if (bitCount > 13) {
        let value = buffer & 8191
        if (value > 88) {
          buffer >>= 13
          bitCount -= 13
        } else {
          value = buffer & 16383
          buffer >>= 14
          bitCount -= 14
        }
        output += base91Alphabet[value % 91] + base91Alphabet[Math.floor(value / 91)]
      }
    }

    if (bitCount) {
      output += base91Alphabet[buffer % 91]
      if (bitCount > 7 || buffer > 90) {
        output += base91Alphabet[Math.floor(buffer / 91)]
      }
    }

    return output
  }

  function base91ToBytes(value) {
    const text = String(value || '')
    const out = []
    let buffer = 0
    let bitCount = 0
    let pair = -1

    for (let index = 0; index < text.length; index++) {
      const ch = text[index]
      const decoded = base91DecodeTable[ch]
      if (decoded == null) continue

      if (pair < 0) {
        pair = decoded
      } else {
        pair += decoded * 91
        buffer |= pair << bitCount
        bitCount += (pair & 8191) > 88 ? 13 : 14
        while (bitCount >= 8) {
          out.push(buffer & 255)
          buffer >>= 8
          bitCount -= 8
        }
        pair = -1
      }
    }

    if (pair >= 0) {
      out.push((buffer | (pair << bitCount)) & 255)
    }

    return new Uint8Array(out)
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
    return 'gz91:' + bytesToBase91(compressed)
  }

  function extractGzipToken(value) {
    const raw = String(value || '').trim()
    if (!raw) return ''
    if (raw.startsWith('gz91:') || raw.startsWith('gz:')) return raw
    const match = raw.match(/gz91:[A-Za-z0-9!#$%&()*+,./:;<=>?@\[\]^_`{|}~"'-]+|gz:[A-Za-z0-9_-]+/)
    return match ? match[0] : ''
  }

  function gunzipFromToken(token) {
    const rawToken = extractGzipToken(token)
    if (!rawToken) return String(token || '').trim()
    const compactToken = rawToken.replace(/\s+/g, '')
    let compressed
    if (compactToken.startsWith('gz91:')) {
      compressed = base91ToBytes(compactToken.slice(5))
    } else if (compactToken.startsWith('gz:')) {
      compressed = base64UrlToBytes(compactToken.slice(3))
    } else {
      return compactToken
    }
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
      if (dataChannel) dataChannel.close()
    } catch (e) { }
    try {
      if (peerConnection) peerConnection.close()
    } catch (e) { }
    dataChannel = null
    peerConnection = null
    connectedClient.value = false
    connectedHost.value = false
    try { engine.saveState() } catch (e) {}
    try { engine.saveState() } catch (e) {}
    try { engine.saveState() } catch (e) {}
    try { engine.saveState() } catch (e) {}
    try { engine.saveState() } catch (e) {}
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
    pc.ondatachannel = (ev) => {
      dataChannel = ev.channel
      dataChannel.onopen = () => { connectedClient.value = true }
      dataChannel.onmessage = handleDataChannelMessage
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
    let qrImages
    try {
      const qrPayloadBuffers = buildPartBinaryPayloads(text, 'answer')
      qrImages = await Promise.all(qrPayloadBuffers.map(async (partBuf) => {
        const input = (typeof Buffer !== 'undefined' && Buffer.from) ? Buffer.from(partBuf) : partBuf
        return await QRCode.toDataURL(input)
      }))
    } catch (err) {
      const qrPayload = gzipToToken(text)
      const qrPayloadParts = buildQrPartPayloads(qrPayload, 'answer')
      qrImages = await Promise.all(qrPayloadParts.map((partPayload) => QRCode.toDataURL(partPayload)))
    }
    answerJson.value = text
    answerQrParts.value = qrImages
    answerQrPartIndex.value = 0
    answerQr.value = answerQrParts.value[0] || ''
    startAnswerQrRotation()
  }

  async function applyAnswer(message) {
    if (!peerConnection) throw new Error('No peer connection (create offer first)')
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
    await peerConnection.setRemoteDescription({ type: 'answer', sdp: obj.sdp })
    if (Array.isArray(obj.candidates)) {
      for (const c of obj.candidates) {
        try { await peerConnection.addIceCandidate(c) } catch (e) { }
      }
    }
  }

  async function sendMessage(role = 'host') {
    const isHost = role === 'host'
    const textRef = outgoingText
    const text = String(textRef.value || '').trim()
    if (!text) return alert('Type a message first')

    if (isHost) {
      if (!dataChannel || dataChannel.readyState !== 'open') {
        return alert('Host data channel is not open yet. Complete signaling first.')
      }
      dataChannel.send(text)
      consoleLogger.value.push('me: ' + text)
      textRef.value = ''
      return
    }

    if (!dataChannel || dataChannel.readyState !== 'open') {
      return alert('Client data channel is not open yet. Complete signaling first.')
    }
    dataChannel.send(text)
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
    isRealtimeGameActive,
    lastGameError,
    requestGameAction,
    requestStartGame,
    requestHistoryFromServer,
    attach, detach
  }
}

export function useWebrtcQrService() {
  if (!serviceInstance) {
    serviceInstance = createWebrtcQrService()
  }
  return serviceInstance
}
