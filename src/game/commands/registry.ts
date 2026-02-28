import kings from './kings'
import saints from './saints'
import units from './units'
import others from './ships_priests_archangels_effects'

import { noop } from './utils'

const registry: Map<string, any> = new Map()

// merge all maps into a single registry
for (const m of [kings, saints, units, others]) {
  for (const [k, v] of m.entries()) registry.set(k, v)
}

export function getCommandFor(title: string) {
  return registry.get(title) || noop
}

export default { getCommandFor }
