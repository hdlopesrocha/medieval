import Command from './Command'
import Card from '../../models/Card'
import { damageTarget } from './utils'
import { moveTargetToPosition, damageTargetCommand, buffTargetProperty } from './abstracts'

const others: Map<string, Command> = new Map()

others.set('Transport Ship', moveTargetToPosition())

others.set('Assault Ship', damageTargetCommand(2))

others.set('Strategic Caravel', moveTargetToPosition())

others.set('Healing Priest', buffTargetProperty('hp', 2))

others.set('Inquisitor Priest', { onPlayed: (engine, g, playerId, targetId) => { if (!targetId) return { ok: false, reason: 'no target' }; const it = engine.cardsInPlay.find((x: any) => x.id === targetId && x.ownerId !== playerId); if (!it) return { ok: false, reason: 'enemy not found' }; it.card.attackPoints = Math.max(0, (it.card.attackPoints || 0) - 1); it.card.defensePoints = Math.max(0, (it.card.defensePoints || 0) - 1) } })

others.set('Guardian Archangel', { onPlayed: (engine, g, playerId) => { for (const a of engine.cardsInPlay.filter((x: any) => x.ownerId === playerId)) if (Math.abs(a.position - g.position) <= 1) a.card.defensePoints = (a.card.defensePoints || 0) + 2 } })

others.set('Wrath Archangel', { onPlayed: (engine, g, playerId, targetId) => { if (!targetId) return { ok: false, reason: 'no target' }; damageTarget(engine, targetId, (g.card.attackPoints || 0), true) } })

others.set('Miracle', { onPlayed: (engine, g, playerId) => { for (const a of engine.cardsInPlay.filter((x: any) => x.ownerId === playerId)) a.card.hp = 10 } })

others.set('Total Siege', { onPlayed: (engine, g, playerId) => { for (const s of engine.cardsInPlay.filter((x: any) => x.ownerId === playerId && x.card.subCategory === 'catapult')) { const enemiesInCastle = engine.cardsInPlay.filter((x: any) => x.position === engine.ZONES.length - 1 && x.ownerId !== playerId); for (const ec of enemiesInCastle) ec.card.hp = Math.max(0, ec.card.hp - (s.card.attackPoints || 0) * 2) } } })

others.set('Forced March', { onPlayed: (engine, g, playerId) => { for (const a of engine.cardsInPlay.filter((x: any) => x.ownerId === playerId)) a.card.velocity = (a.card.velocity || 0) + 1 } })

others.set('Betrayal', { onPlayed: (engine, g, playerId, targetId) => { if (!targetId) return { ok: false, reason: 'no target' }; const betray = engine.cardsInPlay.find((x: any) => x.id === targetId && x.ownerId !== playerId); if (!betray) return { ok: false, reason: 'enemy not found' }; betray.ownerId = playerId } })

export default others
