import Card, { CardType } from '../models/Card'

// Helper to create named copies with random HP (5..10)
function makeNamedCopies(base: { imageUrl: string | string[]; description: string; attack: number; defense: number; type: CardType; velocity: number; range: number }, names: string[]) {
  const arr: Card[] = []
  for (let i = 0; i < names.length; i++) {
    const randomHp = Math.floor(Math.random() * 6) + 5 // 5..10
    const img = Array.isArray(base.imageUrl) ? base.imageUrl[i % base.imageUrl.length] : base.imageUrl
    const randomCost = Math.floor(Math.random() * 5) + 1 // 1..5
    arr.push(
      new Card(
        img,
        names[i],
        base.description,
        base.attack,
        base.defense,
        base.type,
        randomHp,
        base.velocity,
        base.range,
        randomCost
      )
    )
  }
  return arr
}

const catapultNames = ['Siege Artificer', 'Bulwark Bombardier']
const cavalryNames = ['Courier Rider', 'Border Patrol', 'Mounted Messenger', 'Knight Protector']
const archerNames = ['Village Bowman', 'Forest Ranger', 'Town Marksman', 'Royal Huntsman']
const soldierNames = ['Militia Farmer', 'City Guard', 'Road Patrol', 'Garrison Infantry', 'Conscription Recruit', 'Border Watchman', 'Mercenary Spearman', 'Peacekeeper']
const priestNames = ['Court Sage', 'Plague Healer']

export default function createSampleDeck(): Card[] {
  return [
    // 2 Catapult
    ...makeNamedCopies({ 
      imageUrl: '/images/catapult.jpg', 
      description: 'Long-range siege weapon', 
      attack: 12, 
      defense: 2, 
      type: CardType.CATAPULT, 
      velocity: 1, 
      range: 6 
      }, catapultNames),

    // 4 Cavalry
    ...makeNamedCopies({ 
      imageUrl: ['/images/horse_1.jpg','/images/horse_2.jpg'], 
      description: 'Fast melee cavalry', 
      attack: 6, 
      defense: 4, 
      type: CardType.CAVALRY, 
      velocity: 3, 
      range: 1 
      }, cavalryNames),

    // 4 Archers
    ...makeNamedCopies({ 
      imageUrl: ['/images/archer_man.jpg','/images/archer_woman.jpg'], 
      description: 'Ranged unit, weak in melee', 
      attack: 5, 
      defense: 2, 
      type: CardType.ARCHER, 
      velocity: 2, 
      range: 5 
      }, archerNames),

    // 8 Soldiers
    ...makeNamedCopies({ 
      imageUrl: ['/images/soldier_1.jpg','/images/soldier_2.jpg','/images/soldier_3.jpg'], 
      description: 'Basic infantry', 
      attack: 3, 
      defense: 3, 
      type: CardType.SOLDIER, 
      velocity: 2, 
      range: 1 
      }, soldierNames),

    // 2 Priests
    ...makeNamedCopies({ 
      imageUrl: ['/images/priest_1.jpg', '/images/priest_2.jpg'], 
      description: 'Can convert enemy units', 
      attack: 9, 
      defense: 1, 
      type: CardType.PRIEST, 
      velocity: 2, 
      range: 6 
      }, priestNames)
  ]
}
