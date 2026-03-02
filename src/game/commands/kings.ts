import Command from './Command'
import Card from '../../models/Card'
import { damageTarget, noop } from './utils'
import {
  healUnitsAtPosition,
  buffTypeAtPosition,
  reviveTopToCastle,
  damageTargetCommand,
  buffType,
  moveTargetToPosition,
  buffTargetProperty,
  healAllAllies
} from './abstracts'

const kings: Map<string, Command> = new Map()

kings.set('D. Afonso Henriques', {
  onPlayed: (engine, g, playerId, targetId) => {
    if (!targetId) return { ok: false, reason: 'no target' }
    const tgt = engine.cardsInPlay.find((x: any) => x.id === targetId)
    if (!tgt) return { ok: false, reason: 'target not found' }
    if (tgt.position === engine.ZONES.length - 1 && tgt.ownerId !== playerId) {
      damageTarget(engine, targetId, (g.card.attackPoints ?? 0) + 2)
    } else {
      damageTarget(engine, targetId, (g.card.attackPoints ?? 0))
    }
  }
})

kings.set('D. Dinis', healUnitsAtPosition(2, 2))

kings.set('D. João I', buffTypeAtPosition((card: any) => String(card?.title || '').toLowerCase().includes('soldier'), 1, 'defensePoints', 1))

kings.set('D. João II', {
  onPlayed: (engine, g, playerId, targetId) => {
    if (!targetId) return { ok: false, reason: 'no target' }
    engine.cardsInPlay = engine.cardsInPlay.filter((x: any) => x.id !== targetId)
  }
})

kings.set('D. Manuel I', { onPlayed: (engine, g, playerId) => { engine.playedThisRound[playerId] = false } })

kings.set('D. Sebastião', {
  onPlayed: (engine, g, playerId) => {
    for (const a of engine.cardsInPlay.filter((x: any) => x.ownerId === playerId && ['horseArcher', 'horsePikeman', 'heavyKnight', 'lightKnight'].includes(String(x.card?.subCategory || '')))) a.card.attackPoints = (a.card.attackPoints || 0) + 2
    g.card.hp = Math.max(0, (g.card.hp || 0) - 1)
  }
})

kings.set('D. João IV', reviveTopToCastle())

kings.set('D. Pedro I', {
  onPlayed: (engine, g, playerId, targetId) => {
    if (!targetId) return { ok: false, reason: 'no target' }
    // reuse damage helper then heal self
    damageTarget(engine, targetId, 1)
    g.card.hp = (g.card.hp || 0) + 1
  }
})

kings.set('D. Afonso V', buffType((card: any) => ['horseArcher', 'horsePikeman', 'heavyKnight', 'lightKnight'].includes(String(card?.subCategory || '')), 'velocity', 1))

kings.set('D. João III', { onPlayed: (engine, g, playerId) => { for (const e of engine.cardsInPlay.filter((x: any) => x.ownerId !== playerId && x.card.category === 'priest')) { e.card.attackPoints = Math.max(0, (e.card.attackPoints || 0) - 1); e.card.defensePoints = Math.max(0, (e.card.defensePoints || 0) - 1) } } })

kings.set('D. José I', healAllAllies(1))

kings.set('D. João VI', moveTargetToPosition())

kings.set('D. Pedro IV', {
  onPlayed: (engine, g, playerId) => {
    for (const a of engine.cardsInPlay.filter((x: any) => x.ownerId === playerId)) {
      for (const e of engine.cardsInPlay.filter((x: any) => x.ownerId !== playerId)) {
        const dist = Math.abs(e.position - a.position)
        if (dist <= (a.card.range || 0)) e.card.hp = Math.max(0, e.card.hp - (a.card.attackPoints || 0))
      }
    }
  }
})

kings.set('D. Miguel I', { onPlayed: (engine, g, playerId) => { const oppId = engine.players.find((p: any) => p.id !== playerId)?.id; if (oppId != null && engine.hands[oppId] && engine.hands[oppId].length) engine.hands[oppId].splice(0, 1) } })

kings.set('D. Manuel II', buffTargetProperty('defensePoints', 2))

export default kings
