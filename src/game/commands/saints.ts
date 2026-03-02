import Command from './Command'
import Card from '../../models/Card'
import { damageTarget, noop } from './utils'
import {
	drawTop,
	healAllAllies,
	reviveTopToCastle,
	buffType,
	buffTargetProperty,
	removeTarget,
	convertAdjacent,
	buffAllAllies
} from './abstracts'

const saints: Map<string, Command> = new Map()

saints.set('Santo António de Lisboa', drawTop(1))

saints.set('Santa Isabel de Portugal', healAllAllies(3))

saints.set('São João de Deus', reviveTopToCastle())

saints.set('Santa Rita de Cássia', reviveTopToCastle())

saints.set('São Nuno de Santa Maria', {
	onPlayed: (engine, g, playerId) => {
		// buff cavalry attack +2 and defense +1
		buffType((card: any) => ['horseArcher', 'horsePikeman', 'heavyKnight', 'lightKnight'].includes(String(card?.subCategory || '')), 'attackPoints', 2).onPlayed!(engine, g, playerId)
		buffType((card: any) => ['horseArcher', 'horsePikeman', 'heavyKnight', 'lightKnight'].includes(String(card?.subCategory || '')), 'defensePoints', 1).onPlayed!(engine, g, playerId)
	}
})

saints.set('São Vicente', { onPlayed: (engine, g, playerId) => { for (const a of engine.cardsInPlay.filter((x: any) => x.ownerId === playerId && x.position === 0)) a.card.hp = (a.card.hp || 0) + 3 } })

saints.set('São Francisco Xavier', convertAdjacent())

saints.set('São Gonçalo de Amarante', { onPlayed: (engine, g, playerId, targetId) => { if (!targetId) return { ok: false, reason: 'no target' }; const ids = targetId.split(':'); if (ids.length < 2) return { ok: false, reason: 'need two targets' }; const a1 = engine.cardsInPlay.find((x: any) => x.id === ids[0] && x.ownerId === playerId); const a2 = engine.cardsInPlay.find((x: any) => x.id === ids[1] && x.ownerId === playerId); if (!a1 || !a2) return { ok: false, reason: 'allies not found' }; const avg = Math.floor(((a1.card.hp || 0) + (a2.card.hp || 0)) / 2); a1.card.hp = avg; a2.card.hp = avg } })

saints.set('Santa Joana Princesa', { onPlayed: (engine, g, playerId, targetId) => { if (!targetId) return { ok: false, reason: 'no target' }; const sacr = engine.cardsInPlay.find((x: any) => x.id === g.id); const ally = engine.cardsInPlay.find((x: any) => x.id === targetId && x.ownerId === playerId); if (!sacr || !ally) return { ok: false, reason: 'invalid targets' }; sacr.card.hp = 0; ally.card.hp = (ally.card.hp || 0) + 3; engine.cardsInPlay = engine.cardsInPlay.filter((x: any) => x.card.hp > 0) } })

saints.set('São Roque', buffAllAllies('defensePoints', 99))

saints.set('São Teotónio', { onPlayed: (engine, g, playerId) => { engine.cardsInPlay.push({ id: String(Math.random().toString(36).slice(2,9)), card: new Card('', 'Generated Soldier', 'Summoned soldier', '', 2, 1, 'noble', 3, 2, 1, 'swordShield', 'earth'), ownerId: playerId, position: 0, hidden: false }) } })

saints.set('São José', buffTargetProperty('defensePoints', 2))

saints.set('Santa Luzia', { onPlayed: (engine, g, playerId) => { const opp = engine.players.find((p: any) => p.id !== playerId)?.id; if (opp != null && engine.hands[opp] && engine.hands[opp].length) engine.hands[opp].splice(0, 1) } })

saints.set('São Bento', removeTarget())

saints.set('Nossa Senhora de Fátima', { onPlayed: (engine, g, playerId) => { healAllAllies(3).onPlayed!(engine, g, playerId); (engine as any)._skipEnemyAttacks = true } })

export default saints
