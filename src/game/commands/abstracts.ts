import Command from './Command'
import { CardType } from '../../models/Card'
import { damageTarget } from './utils'

export function healAllAllies(amount: number): Command {
  return {
    onPlayed: (engine, g, playerId) => {
      for (const a of engine.cardsInPlay.filter((x: any) => x.ownerId === playerId)) a.card.hp = (a.card.hp || 0) + amount
    }
  }
}

export function healUnitsAtPosition(pos: number, amount: number): Command {
  return {
    onPlayed: (engine, g, playerId) => {
      for (const a of engine.cardsInPlay.filter((x: any) => x.ownerId === playerId && x.position === pos)) a.card.hp = (a.card.hp || 0) + amount
    }
  }
}

export function buffTypeAtPosition(type: CardType, position: number, prop: string, amount: number): Command {
  return {
    onPlayed: (engine, g, playerId) => {
      for (const a of engine.cardsInPlay.filter((x: any) => x.ownerId === playerId && x.position === position && x.card.type === type)) {
        a.card[prop] = (a.card[prop] || 0) + amount
      }
    }
  }
}

export function buffType(type: CardType, prop: string, amount: number): Command {
  return {
    onPlayed: (engine, g, playerId) => {
      for (const a of engine.cardsInPlay.filter((x: any) => x.ownerId === playerId && x.card.type === type)) a.card[prop] = (a.card[prop] || 0) + amount
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
      const mv = engine.cardsInPlay.find((x: any) => x.id === moveId && x.ownerId === playerId)
      if (!mv) return { ok: false, reason: 'ally not found' }
      if (!Number.isFinite(pos) || pos < 0 || pos >= engine.ZONES.length) return { ok: false, reason: 'invalid position' }
      mv.position = pos
    }
  }
}

export function removeTarget(): Command {
  return { onPlayed: (engine, g, playerId, targetId) => { if (!targetId) return { ok: false, reason: 'no target' }; engine.cardsInPlay = engine.cardsInPlay.filter((x: any) => x.id !== targetId) } }
}

export function drawTop(count = 1): Command {
  return { onPlayed: (engine, g, playerId) => { for (let i = 0; i < count; i++) if (engine.deck.length) engine.hands[playerId].push(engine.deck.shift()!) } }
}

export function convertAdjacent(): Command {
  return { onPlayed: (engine, g, playerId, targetId) => { if (!targetId) return { ok: false, reason: 'no target' }; return engine.convertCard(g.id, targetId, playerId) } }
}

export function buffTargetProperty(prop: string, amount: number): Command {
  return {
    onPlayed: (engine, g, playerId, targetId) => {
      if (!targetId) return { ok: false, reason: 'no target' }
      const prot = engine.cardsInPlay.find((x: any) => x.id === targetId && x.ownerId === playerId)
      if (!prot) return { ok: false, reason: 'ally not found' }
      prot.card[prop] = (prot.card[prop] || 0) + amount
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
  buffAllAllies: (prop: string, amount: number): Command => ({ onPlayed: (engine, g, playerId) => { for (const a of engine.cardsInPlay.filter((x: any) => x.ownerId === playerId)) a.card[prop] = (a.card[prop] || 0) + amount } }),
  noopCommand
}

// named export for convenient imports
export function buffAllAllies(prop: string, amount: number): Command {
  return { onPlayed: (engine, g, playerId) => { for (const a of engine.cardsInPlay.filter((x: any) => x.ownerId === playerId)) a.card[prop] = (a.card[prop] || 0) + amount } }
}
