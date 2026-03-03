import Command from './Command'
import { damageTarget } from './utils'

type CardMatcher = string | ((card: any) => boolean)

function matchesCard(card: any, matcher: CardMatcher): boolean {
  if (typeof matcher === 'function') return !!matcher(card)
  const key = String(matcher || '').trim()
  if (!key) return false
  return String(card?.category || '') === key || String(card?.subCategory || '') === key
}

export function healAllAllies(amount: number): Command {
  return {
    onPlayed: (engine, g, playerId) => {
      const cip = engine.cardsInPlay
      for (const a of cip.filter((x: any) => x.ownerId === playerId)) a.card.hp = (a.card.hp || 0) + amount
      engine.cardsInPlay = cip
    }
  }
}

export function healUnitsAtPosition(pos: number, amount: number): Command {
  return {
    onPlayed: (engine, g, playerId) => {
      const cip = engine.cardsInPlay
      for (const a of cip.filter((x: any) => x.ownerId === playerId && x.position === pos)) a.card.hp = (a.card.hp || 0) + amount
      engine.cardsInPlay = cip
    }
  }
}

export function buffTypeAtPosition(matcher: CardMatcher, position: number, prop: string, amount: number): Command {
  return {
    onPlayed: (engine, g, playerId) => {
      const cip = engine.cardsInPlay
      for (const a of cip.filter((x: any) => x.ownerId === playerId && x.position === position && matchesCard(x.card, matcher))) {
        a.card[prop] = (a.card[prop] || 0) + amount
      }
      engine.cardsInPlay = cip
    }
  }
}

export function buffType(matcher: CardMatcher, prop: string, amount: number): Command {
  return {
    onPlayed: (engine, g, playerId) => {
      const cip = engine.cardsInPlay
      for (const a of cip.filter((x: any) => x.ownerId === playerId && matchesCard(x.card, matcher))) a.card[prop] = (a.card[prop] || 0) + amount
      engine.cardsInPlay = cip
    }
  }
}

export function damageTargetCommand(dmg: number, ignoreDefense = false): Command {
  return {
    onPlayed: (engine, g, playerId, targetId) => {
      if (!targetId) return { ok: false, reason: 'no target' }
      damageTarget(engine, targetId, dmg, ignoreDefense)
    }
  }
}

export function selfDamage(amount: number): Command {
  return {
    onPlayed: (engine, g) => { g.card.hp = Math.max(0, (g.card.hp || 0) - amount) }
  }
}

export function reviveTopToCastle(): Command {
  return { onPlayed: (engine, g, playerId) => { engine.reviveTopToCastle(playerId) } }
}

export function moveTargetToPosition(): Command {
  return {
    onPlayed: (engine, g, playerId, targetId) => {
      if (!targetId) return { ok: false, reason: 'no target' }
      const parts = targetId.split(':')
      const moveId = parts[0]
      const pos = Number(parts[1])
      const cip = engine.cardsInPlay
      const mv = cip.find((x: any) => x.id === moveId && x.ownerId === playerId)
      if (!mv) return { ok: false, reason: 'ally not found' }
      if (!Number.isFinite(pos) || pos < 0 || pos >= engine.ZONES.length) return { ok: false, reason: 'invalid position' }
      mv.position = pos
      engine.cardsInPlay = cip
    }
  }
}

export function removeTarget(): Command {
  return { onPlayed: (engine, g, playerId, targetId) => { if (!targetId) return { ok: false, reason: 'no target' }; engine.cardsInPlay = engine.cardsInPlay.filter((x: any) => x.id !== targetId) } }
}

export function drawTop(count = 1): Command {
  return {
    onPlayed: (engine, g, playerId) => {
      const deckArr = engine.deck
      const handsMap = engine.hands
      for (let i = 0; i < count; i++) {
        if (!deckArr.length) break
        const c = deckArr.shift()!
        handsMap[playerId] = handsMap[playerId] || []
        handsMap[playerId].push(c)
      }
      engine.deck = deckArr
      engine.hands = handsMap
    }
  }
}

export function convertAdjacent(): Command {
  return { onPlayed: (engine, g, playerId, targetId) => { if (!targetId) return { ok: false, reason: 'no target' }; return engine.convertCard(g.id, targetId, playerId) } }
}

export function buffTargetProperty(prop: string, amount: number): Command {
  return {
    onPlayed: (engine, g, playerId, targetId) => {
      if (!targetId) return { ok: false, reason: 'no target' }
      const cip = engine.cardsInPlay
      const prot = cip.find((x: any) => x.id === targetId && x.ownerId === playerId)
      if (!prot) return { ok: false, reason: 'ally not found' }
      prot.card[prop] = (prot.card[prop] || 0) + amount
      engine.cardsInPlay = cip
    }
  }
}

export function buffSelf(prop: string, amount: number): Command {
  return { onPlayed: (engine, g) => { g.card[prop] = (g.card[prop] || 0) + amount } }
}

export const noopCommand: Command = {}

export default {
  healAllAllies,
  healUnitsAtPosition,
  buffTypeAtPosition,
  buffType,
  damageTargetCommand,
  selfDamage,
  reviveTopToCastle,
  moveTargetToPosition,
  removeTarget,
  drawTop,
  convertAdjacent,
  // convenience helper
  buffAllAllies,
  noopCommand
}

// named export for convenient imports
export function buffAllAllies(prop: string, amount: number): Command {
  return { onPlayed: (engine, g, playerId) => { const cip = engine.cardsInPlay; for (const a of cip.filter((x: any) => x.ownerId === playerId)) a.card[prop] = (a.card[prop] || 0) + amount; engine.cardsInPlay = cip } }
}
 