// Minimal engine API surface expected by command handlers.
export interface EngineCommandAPI {
  setSkipEnemyAttacks?: (value: boolean) => void
  // Allow other engine members to be accessed by commands; keep index signature
  [key: string]: any
}

export interface Command {
  onPlayed?: (engine: EngineCommandAPI, g: any, playerId: number, targetId?: string) => any
  onMoved?: (engine: EngineCommandAPI, g: any, playerId: number, steps?: number) => any
  onAttack?: (engine: EngineCommandAPI, attacker: any, target: any, playerId: number) => any
}

export default Command
