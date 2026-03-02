export type CardJSON = {
  imageUrl: string
  title: string
  description: string
  effectDescription?: string
  attackPoints: number
  defensePoints: number
  hp: number
  velocity: number
  range: number
  category?: string
  subCategory?: string
  element?: 'earth' | 'water'
  type?: string
}

function normalizeLegacyTypeToCategory(type: unknown): string {
  const key = String(type || '').trim().toUpperCase()
  if (key === 'KING') return 'king'
  if (key === 'PRIEST') return 'priest'
  if (key === 'SAINT') return 'saint'
  if (key === 'ARCHANGEL') return 'hero'
  if (key === 'EFFECT') return 'hero'
  return 'noble'
}

function inferSubCategory(title: string): string {
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
  return 'swordShield'
}

function inferElement(subCategory: string): 'earth' | 'water' {
  const waterSet = new Set(['transportBoat', 'fishBoat', 'warBoat'])
  return waterSet.has(String(subCategory || '')) ? 'water' : 'earth'
}

export default class Card {
  private _imageUrl!: string
  private _title!: string
  private _description!: string
  private _effectDescription!: string
  private _attackPoints!: number
  private _defensePoints!: number
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
    category = 'noble',
    hp = 0,
    velocity = 0,
    range = 0,
    subCategory?: string,
    element?: 'earth' | 'water'
  ) {
    this.imageUrl = imageUrl
    this.title = title
    this.description = description
    this.effectDescription = effectDescription
    this.attackPoints = attackPoints
    this.defensePoints = defensePoints
    this.hp = hp
    this.velocity = velocity
    this.range = range

    const normalizedCategory = normalizeLegacyTypeToCategory(category)
    const resolvedSubCategory = subCategory || inferSubCategory(title)
    this.category = normalizedCategory
    this.subCategory = resolvedSubCategory
    this.element = element || inferElement(this.subCategory)
  }

  get imageUrl(): string { return this._imageUrl }
  get title(): string { return this._title }
  get description(): string { return this._description }
  get effectDescription(): string { return this._effectDescription }
  get attackPoints(): number { return this._attackPoints }
  get defensePoints(): number { return this._defensePoints }
  get hp(): number { return this._hp }
  get velocity(): number { return this._velocity }
  get range(): number { return this._range }
  get category(): string { return this._category }
  get subCategory(): string { return this._subCategory }
  get element(): 'earth' | 'water' { return this._element }

  set imageUrl(value: string) {
    if (!value || typeof value !== 'string') {
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
    const normalized = normalizeLegacyTypeToCategory(value)
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

  toJSON(): CardJSON {
    return {
      imageUrl: this.imageUrl,
      title: this.title,
      description: this.description,
      effectDescription: this.effectDescription,
      attackPoints: this.attackPoints,
      defensePoints: this.defensePoints,
      hp: this.hp,
      velocity: this.velocity,
      range: this.range,
      category: this.category,
      subCategory: this.subCategory,
      element: this.element
    }
  }

  static fromJSON(obj: Partial<CardJSON>): Card {
    if (!obj) throw new TypeError('Invalid object')
    const hpVal = (typeof obj.hp === 'number') ? obj.hp : 0
    const categoryCandidate = String(obj.category || obj.type || 'noble')
    const card = new Card(
      obj.imageUrl ?? '',
      obj.title ?? '',
      obj.description ?? '',
      obj.effectDescription ?? '',
      obj.attackPoints ?? 0,
      obj.defensePoints ?? 0,
      categoryCandidate,
      hpVal,
      obj.velocity ?? 0,
      obj.range ?? 0,
      obj.subCategory,
      obj.element
    )
    card.hp = (typeof obj.hp === 'number') ? obj.hp : hpVal
    return card
  }
}
