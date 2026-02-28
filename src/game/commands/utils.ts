import Command from './Command'
import Card from '../../models/Card'

export const noop: Command = {}

export function damageTarget(engine: any, tid: string, dmg: number, ignoreDefense = false) {
  const t = engine.cardsInPlay.find((x: any) => x.id === tid)
  if (!t) return
  const actual = ignoreDefense ? dmg : Math.max(0, dmg - (t.card.defensePoints ?? 0))
  t.card.hp = Math.max(0, t.card.hp - actual)
}

export default { noop, damageTarget }
