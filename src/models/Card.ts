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
  effectDescription?: string
  attackPoints: number
  defensePoints: number
  type: CardType
  hp: number
  velocity: number
  range: number
  category?: string
  subCategory?: string
  element?: 'earth' | 'water'
}

function inferCategory(type: CardType): string {
  switch (type) {
    case CardType.KING: return 'king'
    case CardType.PRIEST: return 'priest'
    case CardType.SAINT: return 'saint'
    case CardType.ARCHANGEL: return 'hero'
    default: return 'noble'
  }
}

function inferSubCategory(title: string, type: CardType): string {
  const normalized = String(title || '').toLowerCase()
  if (normalized.includes('catapult')) return 'catapult'
  if (normalized.includes('transport')) return 'transportBoat'
  if (normalized.includes('assault') || normalized.includes('caravel') || normalized.includes('war')) return 'warBoat'
  if (normalized.includes('fish')) return 'fishBoat'
  if (normalized.includes('archer') && normalized.includes('horse')) return 'horseArcher'
  if (normalized.includes('archer')) return 'archer'
  if (normalized.includes('pikeman') && normalized.includes('horse')) return 'horsePikeman'
  if (normalized.includes('pikeman')) return 'pikeman'
  if (normalized.includes('heavy') && normalized.includes('knight')) return 'heavyKnight'
  if (normalized.includes('light') && normalized.includes('knight')) return 'lightKnight'
  if (normalized.includes('double')) return 'greatSword'
  if (normalized.includes('shield') || normalized.includes('single')) return 'swordShield'
  if (type === CardType.SHIP) return 'warBoat'
  if (type === CardType.CATAPULT) return 'catapult'
  if (type === CardType.ARCHER) return 'archer'
  return 'swordShield'
}

function inferElement(type: CardType): 'earth' | 'water' {
  return type === CardType.SHIP ? 'water' : 'earth'
}

/**
 * Simple data model for a collectible card.
 * - All fields are private with public getters/setters
 * - Basic validation applied to numeric fields
 * - JSON-friendly via `toJSON()` and `fromJSON()`
 */
export default class Card {
  private _imageUrl!: string
  private _title!: string
  private _description!: string
  private _effectDescription!: string
  private _attackPoints!: number
  private _defensePoints!: number
  private _type!: CardType
  private _hp!: number
  private _velocity!: number
  private _range!: number
  private _category!: string
  private _subCategory!: string
  private _element!: 'earth' | 'water'

  constructor(
    imageUrl: string,
    title: string,
    description: string,
    effectDescription = '',
    attackPoints = 0,
    defensePoints = 0,
    type: CardType = CardType.SOLDIER,
    hp = 0,
    velocity = 0,
    range = 0,
    category?: string,
    subCategory?: string,
    element?: 'earth' | 'water'
  ) {
    this.imageUrl = imageUrl
    this.title = title
    this.description = description
    this.effectDescription = effectDescription
    this.attackPoints = attackPoints
    this.defensePoints = defensePoints
    this.type = type
    // treat constructor hp as the unit's current HP
    this.hp = hp
    this.velocity = velocity
    this.range = range
    this.category = category || inferCategory(type)
    this.subCategory = subCategory || inferSubCategory(title, type)
    this.element = element || inferElement(type)
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

  get effectDescription(): string {
    return this._effectDescription
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

  get category(): string {
    return this._category
  }

  get subCategory(): string {
    return this._subCategory
  }

  get element(): 'earth' | 'water' {
    return this._element
  }

  // Setters with basic validation
  set imageUrl(value: string) {
    if (!value || typeof value !== 'string') {
      // fallback to default card back image when none provided
      this._imageUrl = 'images/backface.jpg'
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

  set effectDescription(value: string) {
    if (typeof value !== 'string') throw new TypeError('effectDescription must be a string')
    this._effectDescription = value
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

  set category(value: string) {
    const normalized = String(value || '').trim().toLowerCase()
    this._category = normalized || 'noble'
  }

  set subCategory(value: string) {
    const key = String(value || '').trim().replace(/\s+/g, '').toLowerCase()
    const aliases: Record<string, string> = {
      'swordshield': 'swordShield',
      'singlehandedsword+shield': 'swordShield',
      'singlehandedswordshield': 'swordShield',
      'greatsword': 'greatSword',
      'doublehandedsword': 'greatSword',
      'archer': 'archer',
      'horsearcher': 'horseArcher',
      'horsepikeman': 'horsePikeman',
      'lightknight': 'lightKnight',
      'heavyknight': 'heavyKnight',
      'pikeman': 'pikeman',
      'catapult': 'catapult',
      'transportboat': 'transportBoat',
      'fishboat': 'fishBoat',
      'warboat': 'warBoat'
    }
    this._subCategory = aliases[key] || 'swordShield'
  }

  set element(value: 'earth' | 'water') {
    this._element = value === 'water' ? 'water' : 'earth'
  }

  // Make serialization to JSON straightforward
  toJSON(): CardJSON {
    return {
      imageUrl: this.imageUrl,
      title: this.title,
      description: this.description,
      effectDescription: this.effectDescription,
      attackPoints: this.attackPoints,
      defensePoints: this.defensePoints,
      type: this.type,
      hp: this.hp,
      velocity: this.velocity,
      range: this.range,
      category: this.category,
      subCategory: this.subCategory,
      element: this.element
    }
  }

  // Construct from a plain object (e.g. parsed JSON)
  static fromJSON(obj: Partial<CardJSON>): Card {
    if (!obj) throw new TypeError('Invalid object')
    const typeCandidate = obj.type && (Object.values(CardType) as string[]).includes(obj.type as string)
      ? (obj.type as CardType)
      : CardType.SOLDIER
    const hpVal = (typeof obj.hp === 'number') ? obj.hp : 0
    const card = new Card(
      obj.imageUrl ?? '',
      obj.title ?? '',
      obj.description ?? '',
      obj.effectDescription ?? '',
      obj.attackPoints ?? 0,
      obj.defensePoints ?? 0,
      typeCandidate,
      hpVal,
      obj.velocity ?? 0,
      obj.range ?? 0,
      obj.category,
      obj.subCategory,
      obj.element
    )
    // if JSON stored a current hp value, restore it (otherwise it remains at max)
    card.hp = (typeof obj.hp === 'number') ? obj.hp : hpVal
    return card
  }
}
