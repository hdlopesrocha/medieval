import Command from './Command'


export function moveTargetToPosition(): Command {
  return {
    onPlayed: (engine, g, playerId, targetId) => {
      if (!targetId) return { ok: false, reason: 'no target' }
      const parts = targetId.split(':')
      const moveId = parts[0]
      const pos = Number(parts[1])
      const cip = engine.getCardsInPlay()
      const mv = cip.find((x: any) => x.id === moveId && x.ownerId === playerId)
      if (!mv) return { ok: false, reason: 'ally not found' }
      if (!Number.isFinite(pos) || pos < 0 || pos >= engine.ZONES.length) return { ok: false, reason: 'invalid position' }
      mv.position = pos
    }
  }
}


export const noopCommand: Command = {}

export default {

  moveTargetToPosition,
  noopCommand
}

