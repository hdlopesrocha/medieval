import Command from './Command'
import Card from '../../models/Card'

export const noop: Command = {}

export function damageTarget(engine: any, tid: string, dmg: number, ignoreDefense = false) {
  const cip = engine.cardsInPlay
  const t = cip.find((x: any) => x.id === tid)
  if (!t) return
  const actual = ignoreDefense ? dmg : Math.max(0, dmg - (t.card.defensePoints ?? 0))
  t.card.hp = Math.max(0, t.card.hp - actual)
  engine.cardsInPlay = cip
}

export default { noop, damageTarget }
