export interface Command {
  onPlayed?: (engine: any, g: any, playerId: number, targetId?: string) => any
  onMoved?: (engine: any, g: any, playerId: number, steps?: number) => any
  onAttack?: (engine: any, attacker: any, target: any, playerId: number) => any
}

export default Command
