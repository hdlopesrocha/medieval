// CardJSON removed — use `Card` instances directly where needed.



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



import { DefaultCardHandler, CardHandler } from '../game/CardHandler'

export default class Card {
  id: number
  imageUrl: string
  title: string
  description: string
  effectDescription: string
  attackPoints: number
  defensePoints: number
  hp: number
  velocity: number
  range: number
  category: string
  subCategory: string
  element: 'earth' | 'water'
  handler: CardHandler

  // All constructor parameters are required for simplicity.
  constructor(
    id: number,
    imageUrl: string,
    title: string,
    description: string,
    effectDescription: string,
    attackPoints: number,
    defensePoints: number,
    hp: number,
    velocity: number,
    range: number,
    category: string,
    subCategory: string,
    element: 'earth' | 'water',
    handler: CardHandler
  ) {
    this.id = id
    this.imageUrl = imageUrl
    this.title = title
    this.description = description
    this.effectDescription = effectDescription
    this.attackPoints = attackPoints
    this.defensePoints = defensePoints
    this.hp = hp
    this.velocity = velocity
    this.range = range
    this.category = category
    this.subCategory = subCategory
    this.element = element
    this.handler = handler || new DefaultCardHandler()
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
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

  static fromJSON(obj: Partial<Record<string, any>>): Card {
    const card = new Card(
      obj.id ?? 0,
      obj.imageUrl ?? '',
      obj.title ?? '',
      obj.description ?? '',
      obj.effectDescription ?? '',
      obj.attackPoints ?? 0,
      obj.defensePoints ?? 0,
      obj.hp ?? 0,
      obj.velocity ?? 0,
      obj.range ?? 0,
      String(obj.category || obj.type || 'noble'),
      String(obj.subCategory || inferSubCategory(String(obj.title || ''))),
      (obj.element === 'water') ? 'water' : 'earth',
      new DefaultCardHandler()
    )
    return card
  }
}
