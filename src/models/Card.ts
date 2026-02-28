export enum CardType {
  SOLDIER = 'SOLDIER',
  ARCHER = 'ARCHER',
  PRIEST = 'PRIEST',
  KING = 'KING',
  SAINT = 'SAINT',
  SHIP = 'SHIP',
  ARCHANGEL = 'ARCHANGEL',
  EFFECT = 'EFFECT',
  CAVALRY = 'CAVALRY',
  CATAPULT = 'CATAPULT'
}

export type CardJSON = {
  imageUrl: string
  title: string
  description: string
  attackPoints: number
  defensePoints: number
  type: CardType
  hp: number
  velocity: number
  range: number
  cost?: number
}

/**
 * Simple data model for a collectible card.
 * - All fields are private with public getters/setters
 * - Basic validation applied to numeric fields
 * - JSON-friendly via `toJSON()` and `fromJSON()`
 */
export default class Card {
  private _imageUrl: string
  private _title: string
  private _description: string
  private _attackPoints: number
  private _defensePoints: number
  private _type: CardType
  private _hp: number
  private _velocity: number
  private _range: number
  private _cost: number

  constructor(
    imageUrl: string,
    title: string,
    description: string,
    attackPoints = 0,
    defensePoints = 0,
    type: CardType = CardType.SOLDIER,
    hp = 0,
    velocity = 0,
    range = 0
    , cost = 1
  ) {
    this.imageUrl = imageUrl
    this.title = title
    this.description = description
    this.attackPoints = attackPoints
    this.defensePoints = defensePoints
    this.type = type
    this.hp = hp
    this.velocity = velocity
    this.range = range
    this.cost = cost
  }

  // Getters
  get imageUrl(): string {
    return this._imageUrl
  }

  get title(): string {
    return this._title
  }

  get description(): string {
    return this._description
  }

  get attackPoints(): number {
    return this._attackPoints
  }

  get defensePoints(): number {
    return this._defensePoints
  }

  get type(): CardType {
    return this._type
  }

  get hp(): number {
    return this._hp
  }

  get velocity(): number {
    return this._velocity
  }

  get range(): number {
    return this._range
  }

  get cost(): number {
    return this._cost
  }

  // Setters with basic validation
  set imageUrl(value: string) {
    if (!value || typeof value !== 'string') {
      // fallback to default card back image when none provided
      this._imageUrl = '/images/backface.jpg'
      return
    }
    this._imageUrl = value
  }

  set title(value: string) {
    if (!value || typeof value !== 'string') throw new TypeError('title must be a non-empty string')
    this._title = value
  }

  set description(value: string) {
    if (typeof value !== 'string') throw new TypeError('description must be a string')
    this._description = value
  }

  set attackPoints(value: number) {
    if (!Number.isFinite(value) || value < 0) throw new RangeError('attackPoints must be a non-negative number')
    this._attackPoints = Math.trunc(value)
  }

  set defensePoints(value: number) {
    if (!Number.isFinite(value) || value < 0) throw new RangeError('defensePoints must be a non-negative number')
    this._defensePoints = Math.trunc(value)
  }

  set type(value: CardType) {
    if (!Object.values(CardType).includes(value)) throw new TypeError('Invalid card type')
    this._type = value
  }

  set hp(value: number) {
    if (!Number.isFinite(value) || value < 0) throw new RangeError('hp must be a non-negative number')
    this._hp = Math.trunc(value)
  }

  set velocity(value: number) {
    if (!Number.isFinite(value) || value < 0) throw new RangeError('velocity must be a non-negative number')
    this._velocity = Math.trunc(value)
  }

  set range(value: number) {
    if (!Number.isFinite(value) || value < 0) throw new RangeError('range must be a non-negative number')
    this._range = Math.trunc(value)
  }

  set cost(value: number) {
    if (!Number.isFinite(value) || value < 0) throw new RangeError('cost must be a non-negative number')
    this._cost = Math.trunc(value)
  }

  // Make serialization to JSON straightforward
  toJSON(): CardJSON {
    return {
      imageUrl: this.imageUrl,
      title: this.title,
      description: this.description,
      attackPoints: this.attackPoints,
      defensePoints: this.defensePoints,
      type: this.type,
      hp: this.hp,
      velocity: this.velocity,
      range: this.range,
      cost: this.cost
    }
  }

  // Construct from a plain object (e.g. parsed JSON)
  static fromJSON(obj: Partial<CardJSON>): Card {
    if (!obj) throw new TypeError('Invalid object')
    const typeCandidate = obj.type && (Object.values(CardType) as string[]).includes(obj.type as string)
      ? (obj.type as CardType)
      : CardType.SOLDIER

    return new Card(
      obj.imageUrl ?? '',
      obj.title ?? '',
      obj.description ?? '',
      obj.attackPoints ?? 0,
      obj.defensePoints ?? 0,
      typeCandidate,
      obj.hp ?? 0,
      obj.velocity ?? 0,
      obj.range ?? 0,
      obj.cost ?? 1
    )
  }
}
