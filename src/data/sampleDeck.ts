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

// Initial deck based on provided roster
export function createInitialDeck(): Card[] {
  return [
    new Card('', 'D. Afonso Henriques', 'First King of Portugal, leading his armies to conquer castles.', 2, 2, CardType.KING, 6, 2, 1, 1),
    new Card('', 'D. Dinis', 'Wise poet king nurturing his lands and troops.', 1, 2, CardType.KING, 6, 2, 1, 1),
    new Card('', 'D. João I', 'Protector of the realm and founder of the House of Avis.', 2, 3, CardType.KING, 6, 2, 1, 1),
    new Card('', 'D. João II', 'The “Perfect Prince”, eliminating threats with strategy.', 2, 2, CardType.KING, 5, 2, 1, 1),
    new Card('', 'D. Manuel I', 'The Expansion King, gaining advantage in every turn.', 1, 2, CardType.KING, 6, 2, 1, 1),
    new Card('', 'D. Sebastião', 'Young king leading brave but risky cavalry charges.', 3, 1, CardType.KING, 5, 2, 1, 1),
    new Card('', 'D. João IV', 'Restorer of Independence, bringing troops back from defeat.', 2, 2, CardType.KING, 6, 2, 1, 1),
    new Card('', 'D. Pedro I', 'Justice king who punishes enemies when allies fall.', 2, 2, CardType.KING, 5, 2, 1, 1),
    new Card('', 'D. Afonso V', '“The African” king, swift and aggressive on the battlefield.', 2, 1, CardType.KING, 5, 2, 1, 1),
    new Card('', 'D. João III', 'Inquisitor king, silencing enemy priests.', 1, 2, CardType.KING, 5, 2, 1, 1),
    new Card('', 'D. José I', 'King overseeing recovery after disasters.', 1, 2, CardType.KING, 6, 2, 1, 1),
    new Card('', 'D. João VI', 'King who moves troops strategically across the land.', 1, 2, CardType.KING, 6, 2, 1, 1),
    new Card('', 'D. Pedro IV', 'Liberal king empowering soldiers to strike quickly.', 2, 2, CardType.KING, 5, 2, 1, 1),
    new Card('', 'D. Miguel I', 'Absolutist king forcing the opponent to lose resources.', 2, 2, CardType.KING, 5, 2, 1, 1),
    new Card('', 'D. Manuel II', 'The last king, shielding his forces in retreat.', 2, 2, CardType.KING, 5, 2, 1, 1),
    new Card('', 'Santo António de Lisboa', 'Patron saint finding lost items, guiding troops.', 1, 2, CardType.SAINT, 4, 2, 1, 1),
    new Card('', 'Santa Isabel de Portugal', 'Queen saint spreading blessings and healing.', 1, 2, CardType.SAINT, 4, 2, 1, 1),
    new Card('', 'São João de Deus', 'Caregiver saint restoring fallen warriors.', 1, 2, CardType.SAINT, 4, 2, 1, 1),
    new Card('', 'São Nuno de Santa Maria', 'Warrior saint boosting mounted units in battle.', 2, 2, CardType.SAINT, 5, 2, 1, 1),
    new Card('', 'São Vicente', 'Protector of the city, reinforcing fortifications.', 1, 2, CardType.SAINT, 4, 2, 1, 1),
    new Card('', 'São Francisco Xavier', 'Missionary saint converting enemy troops.', 2, 2, CardType.SAINT, 4, 2, 1, 1),
    new Card('', 'Santa Rita de Cássia', 'Performs miracles, bringing units back to life.', 1, 2, CardType.SAINT, 4, 2, 1, 1),
    new Card('', 'São Gonçalo de Amarante', 'Saint connecting allies with shared strength.', 1, 2, CardType.SAINT, 4, 2, 1, 1),
    new Card('', 'Santa Joana Princesa', 'Saint sacrificing herself to protect another unit.', 1, 2, CardType.SAINT, 4, 2, 1, 1),
    new Card('', 'São Roque', 'Saint warding allies against attacks.', 1, 2, CardType.SAINT, 4, 2, 1, 1),
    new Card('', 'São Teotónio', 'First Portuguese saint inspiring new soldiers.', 1, 2, CardType.SAINT, 4, 2, 1, 1),
    new Card('', 'São José', 'Saint creating divine protection.', 1, 2, CardType.SAINT, 4, 2, 1, 1),
    new Card('', 'Santa Luzia', 'Saint seeing hidden threats in enemy hand.', 1, 2, CardType.SAINT, 4, 2, 1, 1),
    new Card('', 'São Bento', 'Saint banishing enemies with holy authority.', 2, 2, CardType.SAINT, 4, 2, 1, 1),
    new Card('', 'Nossa Senhora de Fátima', 'Marian apparition protecting allies completely.', 1, 2, CardType.SAINT, 5, 2, 1, 1),
    new Card('', 'Line Soldier', 'Frontline soldier taking hits for comrades.', 2, 1, CardType.SOLDIER, 3, 2, 1, 1),
    new Card('', 'Siege Soldier', 'Soldier specialized in breaking walls.', 2, 1, CardType.SOLDIER, 3, 2, 1, 1),
    new Card('', 'Devoted Soldier', 'Soldier empowered by nearby saints.', 2, 1, CardType.SOLDIER, 3, 2, 1, 1),
    new Card('', 'Shock Cavalry', 'Fast cavalry striking suddenly at enemies.', 3, 1, CardType.CAVALRY, 4, 3, 1, 1),
    new Card('', 'Guard Cavalry', 'Cavalry defending key positions.', 2, 2, CardType.CAVALRY, 4, 3, 1, 1),
    new Card('', 'Wandering Cavalry', 'Cavalry deciding between offense or support.', 2, 2, CardType.CAVALRY, 4, 3, 1, 1),
    new Card('', 'Siege Catapult', 'Heavy catapult pounding castle walls.', 4, 0, CardType.CATAPULT, 3, 1, 1, 1),
    new Card('', 'Fire Catapult', 'Catapult raining fire on multiple enemies.', 3, 0, CardType.CATAPULT, 3, 1, 1, 1),
    new Card('', 'Destruction Catapult', 'Catapult destroying defenses and fortifications.', 4, 0, CardType.CATAPULT, 3, 1, 1, 1),
    new Card('', 'Transport Ship', 'Ship transporting troops across water.', 1, 2, CardType.SHIP, 4, 2, 1, 1),
    new Card('', 'Assault Ship', 'Ship firing upon enemy fortress.', 3, 2, CardType.SHIP, 4, 2, 1, 1),
    new Card('', 'Strategic Caravel', 'Caravel repositioning allies or enemies.', 2, 2, CardType.SHIP, 4, 2, 1, 1),
    new Card('', 'Healing Priest', 'Priest restoring an adjacent unit.', 1, 1, CardType.PRIEST, 3, 2, 1, 1),
    new Card('', 'Inquisitor Priest', 'Priest suppressing enemy magic or abilities.', 1, 1, CardType.PRIEST, 3, 2, 1, 1),
    new Card('', 'Guardian Archangel', 'Angel shielding nearby units.', 2, 2, CardType.ARCHANGEL, 5, 2, 1, 1),
    new Card('', 'Wrath Archangel', 'Angel dealing direct, unstoppable damage.', 3, 2, CardType.ARCHANGEL, 5, 2, 1, 1),
    new Card('', 'Miracle', 'Instant divine restoration for units or castle.', 0, 0, CardType.EFFECT, 0, 0, 0, 1),
    new Card('', 'Total Siege', 'All siege engines strike simultaneously.', 0, 0, CardType.EFFECT, 0, 0, 0, 1),
    new Card('', 'Forced March', 'Army advances faster across the map.', 0, 0, CardType.EFFECT, 0, 0, 0, 1),
    new Card('', 'Betrayal', 'Turn an enemy unit to your side temporarily.', 0, 0, CardType.EFFECT, 0, 0, 0, 1)
  ]}
