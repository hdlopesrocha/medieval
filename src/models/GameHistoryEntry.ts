export class GameHistoryEntry {
  order: number = 0;
  timestamp: number = 0;
  isoTime: string = '';
  action: string = '';
  activePlayerId: number = 0;
  round: number = 0;
  gameOver: boolean = false;
  deckCount: number = 0;
  cardsInPlayCount: number = 0;
  castleHpByPlayer: Record<string, number> = {};

  constructor(init?: Partial<GameHistoryEntry>) {
    Object.assign(this, init);
  }
}
