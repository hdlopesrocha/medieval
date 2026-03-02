import Command from './Command'
import Card from '../../models/Card'
import { damageTarget, noop } from './utils'
import { buffSelf } from './abstracts'

const units: Map<string, Command> = new Map()

units.set('Devoted Soldier', noop)
units.set('Line Soldier', noop)
units.set('Siege Soldier', noop)

units.set('Shock Cavalry', { onPlayed: (engine, g, playerId, targetId) => { if (targetId) { const t = engine.cardsInPlay.find((x: any) => x.id === targetId); if (t) { t.card.hp = Math.max(0, t.card.hp - (g.card.attackPoints || 0)) } } } })

units.set('Guard Cavalry', buffSelf('defensePoints', 2))

units.set('Wandering Cavalry', { onPlayed: (engine, g, playerId, targetId) => { if (!targetId) return { ok: false, reason: 'no target' }; const tg = engine.cardsInPlay.find((x: any) => x.id === targetId); if (!tg) return { ok: false, reason: 'target not found' }; if (tg.ownerId === playerId) tg.card.hp = (tg.card.hp || 0) + 1; else tg.card.hp = Math.max(0, (tg.card.hp || 0) - (g.card.attackPoints || 0)) } })

units.set('Siege Catapult', { onPlayed: (engine, g, playerId, targetId) => { if (!targetId) return { ok: false, reason: 'no target' }; const ct = engine.cardsInPlay.find((x: any) => x.id === targetId); if (!ct) return { ok: false, reason: 'target not found' }; if (ct.position === engine.ZONES.length - 1) damageTarget(engine, targetId, (g.card.attackPoints || 0) + 4); else damageTarget(engine, targetId, g.card.attackPoints || 0) } })

units.set('Fire Catapult', { onPlayed: (engine, g) => { for (const e of engine.cardsInPlay.filter((x: any) => x.ownerId !== g.ownerId)) { if (Math.abs(e.position - g.position) <= 1) e.card.hp = Math.max(0, e.card.hp - (g.card.attackPoints || 0)) } } })

units.set('Destruction Catapult', { onPlayed: (engine, g) => { for (const e of engine.cardsInPlay.filter((x: any) => x.ownerId !== g.ownerId)) if (Math.abs(e.position - g.position) <= (g.card.range || 0)) e.card.defensePoints = Math.max(0, (e.card.defensePoints || 0) - 2) } })

export default units
