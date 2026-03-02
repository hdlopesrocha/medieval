import Card, { CardType } from '../models/Card'
import { asset } from '../utils/asset'

type CardTaxonomy = {
  category: 'king' | 'priest' | 'saint' | 'hero' | 'noble'
  subCategory:
    | 'swordShield'
    | 'greatSword'
    | 'archer'
    | 'horseArcher'
    | 'horsePikeman'
    | 'lightKnight'
    | 'heavyKnight'
    | 'pikeman'
    | 'catapult'
    | 'transportBoat'
    | 'fishBoat'
    | 'warBoat'
  element: 'earth' | 'water'
}

const EXPLICIT_TAXONOMY_BY_TITLE: Record<string, CardTaxonomy> = {
  'D. Afonso Henriques': { category: 'king', subCategory: 'swordShield', element: 'earth' },
  'D. Dinis': { category: 'king', subCategory: 'swordShield', element: 'earth' },
  'D. João I': { category: 'king', subCategory: 'swordShield', element: 'earth' },
  'D. João II': { category: 'king', subCategory: 'swordShield', element: 'earth' },
  'D. Manuel I': { category: 'king', subCategory: 'swordShield', element: 'earth' },
  'D. Sebastião': { category: 'king', subCategory: 'swordShield', element: 'earth' },
  'D. João IV': { category: 'king', subCategory: 'swordShield', element: 'earth' },
  'D. Pedro I': { category: 'king', subCategory: 'swordShield', element: 'earth' },
  'D. Afonso V': { category: 'king', subCategory: 'swordShield', element: 'earth' },
  'D. João III': { category: 'king', subCategory: 'swordShield', element: 'earth' },
  'D. José I': { category: 'king', subCategory: 'swordShield', element: 'earth' },
  'D. João VI': { category: 'king', subCategory: 'swordShield', element: 'earth' },
  'D. Pedro IV': { category: 'king', subCategory: 'swordShield', element: 'earth' },
  'D. Miguel I': { category: 'king', subCategory: 'swordShield', element: 'earth' },
  'D. Manuel II': { category: 'king', subCategory: 'swordShield', element: 'earth' },

  'Santo António de Lisboa': { category: 'saint', subCategory: 'swordShield', element: 'earth' },
  'Santa Isabel de Portugal': { category: 'saint', subCategory: 'swordShield', element: 'earth' },
  'São João de Deus': { category: 'saint', subCategory: 'swordShield', element: 'earth' },
  'São Nuno de Santa Maria': { category: 'saint', subCategory: 'swordShield', element: 'earth' },
  'São Vicente': { category: 'saint', subCategory: 'swordShield', element: 'earth' },
  'São Francisco Xavier': { category: 'saint', subCategory: 'swordShield', element: 'earth' },
  'Santa Rita de Cássia': { category: 'saint', subCategory: 'swordShield', element: 'earth' },
  'São Gonçalo de Amarante': { category: 'saint', subCategory: 'swordShield', element: 'earth' },
  'Santa Joana Princesa': { category: 'saint', subCategory: 'swordShield', element: 'earth' },
  'São Roque': { category: 'saint', subCategory: 'swordShield', element: 'earth' },
  'São Teotónio': { category: 'saint', subCategory: 'swordShield', element: 'earth' },
  'São José': { category: 'saint', subCategory: 'swordShield', element: 'earth' },
  'Santa Luzia': { category: 'saint', subCategory: 'swordShield', element: 'earth' },
  'São Bento': { category: 'saint', subCategory: 'swordShield', element: 'earth' },
  'Nossa Senhora de Fátima': { category: 'saint', subCategory: 'swordShield', element: 'earth' },

  'Line Soldier': { category: 'noble', subCategory: 'swordShield', element: 'earth' },
  'Siege Soldier': { category: 'noble', subCategory: 'swordShield', element: 'earth' },
  'Devoted Soldier': { category: 'noble', subCategory: 'swordShield', element: 'earth' },

  'Shock Cavalry': { category: 'noble', subCategory: 'horsePikeman', element: 'earth' },
  'Guard Cavalry': { category: 'noble', subCategory: 'heavyKnight', element: 'earth' },
  'Wandering Cavalry': { category: 'noble', subCategory: 'horseArcher', element: 'earth' },

  'Siege Catapult': { category: 'noble', subCategory: 'catapult', element: 'earth' },
  'Fire Catapult': { category: 'noble', subCategory: 'catapult', element: 'earth' },
  'Destruction Catapult': { category: 'noble', subCategory: 'catapult', element: 'earth' },

  'Transport Ship': { category: 'noble', subCategory: 'transportBoat', element: 'water' },
  'Assault Ship': { category: 'noble', subCategory: 'warBoat', element: 'water' },
  'Strategic Caravel': { category: 'noble', subCategory: 'warBoat', element: 'water' },

  'Healing Priest': { category: 'priest', subCategory: 'swordShield', element: 'earth' },
  'Inquisitor Priest': { category: 'priest', subCategory: 'swordShield', element: 'earth' },

  'Guardian Archangel': { category: 'hero', subCategory: 'greatSword', element: 'earth' },
  'Wrath Archangel': { category: 'hero', subCategory: 'greatSword', element: 'earth' },

  'Miracle': { category: 'hero', subCategory: 'swordShield', element: 'earth' },
  'Total Siege': { category: 'hero', subCategory: 'catapult', element: 'earth' },
  'Forced March': { category: 'hero', subCategory: 'horseArcher', element: 'earth' },
  'Betrayal': { category: 'hero', subCategory: 'swordShield', element: 'earth' },

  'Reserve Soldier 1': { category: 'noble', subCategory: 'swordShield', element: 'earth' },
  'Reserve Soldier 2': { category: 'noble', subCategory: 'swordShield', element: 'earth' },
  'Reserve Soldier 3': { category: 'noble', subCategory: 'swordShield', element: 'earth' },
  'Reserve Soldier 4': { category: 'noble', subCategory: 'swordShield', element: 'earth' },
  'Reserve Soldier 5': { category: 'noble', subCategory: 'swordShield', element: 'earth' },
  'Reserve Soldier 6': { category: 'noble', subCategory: 'swordShield', element: 'earth' },
  'Reserve Soldier 7': { category: 'noble', subCategory: 'swordShield', element: 'earth' },
  'Reserve Soldier 8': { category: 'noble', subCategory: 'swordShield', element: 'earth' },
  'Reserve Soldier 9': { category: 'noble', subCategory: 'swordShield', element: 'earth' },
  'Reserve Soldier 10': { category: 'noble', subCategory: 'swordShield', element: 'earth' },
  'Reserve Soldier 11': { category: 'noble', subCategory: 'swordShield', element: 'earth' },
  'Reserve Soldier 12': { category: 'noble', subCategory: 'swordShield', element: 'earth' },
  'Reserve Soldier 13': { category: 'noble', subCategory: 'swordShield', element: 'earth' },
  'Reserve Soldier 14': { category: 'noble', subCategory: 'swordShield', element: 'earth' },
  'Reserve Soldier 15': { category: 'noble', subCategory: 'swordShield', element: 'earth' },
  'Reserve Soldier 16': { category: 'noble', subCategory: 'swordShield', element: 'earth' },
  'Reserve Soldier 17': { category: 'noble', subCategory: 'swordShield', element: 'earth' },
  'Reserve Soldier 18': { category: 'noble', subCategory: 'swordShield', element: 'earth' },
  'Reserve Soldier 19': { category: 'noble', subCategory: 'swordShield', element: 'earth' },
  'Reserve Soldier 20': { category: 'noble', subCategory: 'swordShield', element: 'earth' },
  'Reserve Soldier 21': { category: 'noble', subCategory: 'swordShield', element: 'earth' },
  'Reserve Soldier 22': { category: 'noble', subCategory: 'swordShield', element: 'earth' },
  'Reserve Soldier 23': { category: 'noble', subCategory: 'swordShield', element: 'earth' },
  'Reserve Soldier 24': { category: 'noble', subCategory: 'swordShield', element: 'earth' },
  'Reserve Soldier 25': { category: 'noble', subCategory: 'swordShield', element: 'earth' },
  'Reserve Soldier 26': { category: 'noble', subCategory: 'swordShield', element: 'earth' },
  'Reserve Soldier 27': { category: 'noble', subCategory: 'swordShield', element: 'earth' },
  'Reserve Soldier 28': { category: 'noble', subCategory: 'swordShield', element: 'earth' },
  'Reserve Soldier 29': { category: 'noble', subCategory: 'swordShield', element: 'earth' },
  'Reserve Soldier 30': { category: 'noble', subCategory: 'swordShield', element: 'earth' }
}

function buildExplicitTaxonomy(card: Card): CardTaxonomy {
  const taxonomy = EXPLICIT_TAXONOMY_BY_TITLE[card.title]
  if (!taxonomy) throw new Error(`missingExplicitTaxonomy:${card.title}`)
  return taxonomy
}

function withExplicitTaxonomy(cards: Card[]): Card[] {
  return cards.map((card) => {
    const taxonomy = buildExplicitTaxonomy(card)
    return new Card(
      card.imageUrl,
      card.title,
      card.description,
      card.effectDescription,
      card.attackPoints,
      card.defensePoints,
      card.type,
      card.hp,
      card.velocity,
      card.range,
      taxonomy.category,
      taxonomy.subCategory,
      taxonomy.element
    )
  })
}

// Manually authored initial deck: 80 explicit Card instances.
// Optional `imageFor(title)` callback can provide per-card image URLs.
export function createInitialDeck(imageFor?: (title: string) => string): Card[] {
  const imgFor = (title: string) => (typeof imageFor === 'function' ? imageFor(title) : '') || ''
  const img = (url: string) => asset(url)

  const cards: Card[] = [
    new Card(img('assets/afonsohenriques.jpg'), 'D. Afonso Henriques', 'First King of Portugal, leading his armies to conquer castles.', '+2 Attack against enemy castle.', 2, 2, CardType.KING, 6, 2, 1),
    new Card(img('assets/dinis.jpg'), 'D. Dinis', 'Wise poet king nurturing his lands and troops.', 'Heal 1 Life to all units in Agriculture.', 1, 2, CardType.KING, 6, 2, 1),
    new Card(img('assets/joao1.jpg'), 'D. João I', 'Protector of the realm and founder of the House of Avis.', 'Soldiers +1 Defense in Civilization.', 2, 3, CardType.KING, 6, 2, 1),
    new Card(img('assets/joao2.jpg'), 'D. João II', 'The “Perfect Prince”, eliminating threats with strategy.', 'Remove 1 enemy unit.', 2, 2, CardType.KING, 5, 2, 1),
    new Card(img('assets/manuel1.jpg'), 'D. Manuel I', 'The Expansion King, gaining advantage in every turn.', 'Play 1 extra card.', 1, 2, CardType.KING, 6, 2, 1),
    new Card(img('assets/sebastiao1.jpg'), 'D. Sebastião', 'Young king leading brave but risky cavalry charges.', 'Cavalry +2 Attack, lose 1 Life (king).', 3, 1, CardType.KING, 5, 2, 1),
    new Card(img('assets/joao4.jpg'), 'D. João IV', 'Restorer of Independence, bringing troops back from defeat.', 'Revive 1 allied unit.', 2, 2, CardType.KING, 6, 2, 1),
    new Card(img('assets/pedro1.jpg'), 'D. Pedro I', 'Justice king who punishes enemies when allies fall.', 'Drain 1 Life from enemy (to this unit).', 2, 2, CardType.KING, 5, 2, 1),
    new Card(img('assets/afonso5.jpg'), 'D. Afonso V', '“The African” king, swift and aggressive on the battlefield.', 'Cavalry +1 Movement.', 2, 1, CardType.KING, 5, 2, 1),
    new Card(img('assets/joao3.jpg'), 'D. João III', 'Inquisitor king, silencing enemy priests.', 'Enemy priests lose effects (reduce their stats).', 1, 2, CardType.KING, 5, 2, 1),
    new Card(img('assets/noface.jpg'), 'D. José I', 'King overseeing recovery after disasters.', 'Remove all negative effects (heal allies).', 1, 2, CardType.KING, 6, 2, 1),
    new Card(img('assets/noface.jpg'), 'D. João VI', 'King who moves troops strategically across the land.', 'Move any allied unit.', 1, 2, CardType.KING, 6, 2, 1),
    new Card(img('assets/noface.jpg'), 'D. Pedro IV', 'Liberal king empowering soldiers to strike quickly.', 'Units attack immediately.', 2, 2, CardType.KING, 5, 2, 1),
    new Card(img('assets/noface.jpg'), 'D. Miguel I', 'Absolutist king forcing the opponent to lose resources.', 'Enemy discards 1 card.', 2, 2, CardType.KING, 5, 2, 1),
    new Card(img('assets/noface.jpg'), 'D. Manuel II', 'The last king, shielding his forces in retreat.', 'Protect 1 allied unit (+defense).', 2, 2, CardType.KING, 5, 2, 1),

    new Card(img('assets/noface.jpg'), 'Santo António de Lisboa', 'Patron saint finding lost items, guiding troops.', 'Search any card (draw top deck).', 1, 2, CardType.SAINT, 4, 2, 1),
    new Card(img('assets/noface.jpg'), 'Santa Isabel de Portugal', 'Queen saint spreading blessings and healing.', 'Heal 3 Life to all allies.', 1, 2, CardType.SAINT, 4, 2, 1),
    new Card(img('assets/noface.jpg'), 'São João de Deus', 'Caregiver saint restoring fallen warriors.', 'Revive 1 unit to your castle.', 1, 2, CardType.SAINT, 4, 2, 1),
    new Card(img('assets/noface.jpg'), 'São Nuno de Santa Maria', 'Warrior saint boosting mounted units in battle.', 'Cavalry +2 Attack & +1 Defense.', 2, 2, CardType.SAINT, 5, 2, 1),
    new Card(img('assets/noface.jpg'), 'São Vicente', 'Protector of the city, reinforcing fortifications.', 'Castle +3 Health (heal allied in castle).', 1, 2, CardType.SAINT, 4, 2, 1),
    new Card(img('assets/noface.jpg'), 'São Francisco Xavier', 'Missionary saint converting enemy troops.', 'Convert 1 adjacent enemy.', 2, 2, CardType.SAINT, 4, 2, 1),
    new Card(img('assets/noface.jpg'), 'Santa Rita de Cássia', 'Performs miracles, bringing units back to life.', 'Revive any card to castle.', 1, 2, CardType.SAINT, 4, 2, 1),
    new Card(img('assets/noface.jpg'), 'São Gonçalo de Amarante', 'Saint connecting allies with shared strength.', '2 units share Life (average HP).', 1, 2, CardType.SAINT, 4, 2, 1),
    new Card(img('assets/noface.jpg'), 'Santa Joana Princesa', 'Saint sacrificing herself to protect another unit.', 'Sacrifice to save (give +3 HP).', 1, 2, CardType.SAINT, 4, 2, 1),
    new Card(img('assets/noface.jpg'), 'São Roque', 'Saint warding allies against attacks.', 'Units immune 1 turn (large temporary defense).', 1, 2, CardType.SAINT, 4, 2, 1),
    new Card(img('assets/noface.jpg'), 'São Teotónio', 'First Portuguese saint inspiring new soldiers.', 'Generate 1 Soldier into your castle.', 1, 2, CardType.SAINT, 4, 2, 1),
    new Card(img('assets/noface.jpg'), 'São José', 'Saint creating divine protection.', 'Shield a unit (+defense).', 1, 2, CardType.SAINT, 4, 2, 1),
    new Card(img('assets/noface.jpg'), 'Santa Luzia', 'Saint seeing hidden threats in enemy hand.', 'Reveal & discard (enemy loses a card).', 1, 2, CardType.SAINT, 4, 2, 1),
    new Card(img('assets/noface.jpg'), 'São Bento', 'Saint banishing enemies with holy authority.', 'Remove 1 enemy unit.', 2, 2, CardType.SAINT, 4, 2, 1),
    new Card(img('assets/noface.jpg'), 'Nossa Senhora de Fátima', 'Marian apparition protecting allies completely.', 'Heal all & stop attacks (skip enemy attacks next phase).', 1, 2, CardType.SAINT, 5, 2, 1),

    new Card(img('assets/noface.jpg'), 'Line Soldier', 'Frontline soldier taking hits for comrades.', 'Protect ally (taunt-like).', 2, 1, CardType.SOLDIER, 3, 2, 1),
    new Card(img('assets/noface.jpg'), 'Siege Soldier', 'Soldier specialized in breaking walls.', '+1 Attack vs castle.', 2, 1, CardType.SOLDIER, 3, 2, 1),
    new Card(img('assets/noface.jpg'), 'Devoted Soldier', 'Soldier empowered by nearby saints.', 'Heals if a Saint is present nearby.', 2, 1, CardType.SOLDIER, 3, 2, 1),

    new Card(img('assets/noface.jpg'), 'Shock Cavalry', 'Fast cavalry striking suddenly at enemies.', 'Move & attack (swift strike).', 3, 1, CardType.CAVALRY, 4, 3, 1),
    new Card(img('assets/noface.jpg'), 'Guard Cavalry', 'Cavalry defending key positions.', 'Block first attack (increased defense).', 2, 2, CardType.CAVALRY, 4, 3, 1),
    new Card(img('assets/noface.jpg'), 'Wandering Cavalry', 'Cavalry deciding between offense or support.', 'Heal or damage a target (ally heal or enemy damage).', 2, 2, CardType.CAVALRY, 4, 3, 1),

    new Card(img('assets/noface.jpg'), 'Siege Catapult', 'Heavy catapult pounding castle walls.', '+4 vs castle (high damage to castle units).', 4, 0, CardType.CATAPULT, 3, 1, 1),
    new Card(img('assets/noface.jpg'), 'Fire Catapult', 'Catapult raining fire on multiple enemies.', 'Area damage to nearby enemies.', 3, 0, CardType.CATAPULT, 3, 1, 1),
    new Card(img('assets/noface.jpg'), 'Destruction Catapult', 'Catapult destroying defenses and fortifications.', 'Remove shields (reduce enemy defense).', 4, 0, CardType.CATAPULT, 3, 1, 1),

    new Card(img('assets/noface.jpg'), 'Transport Ship', 'Ship transporting troops across water.', 'Move land unit (transport to new position).', 1, 2, CardType.SHIP, 4, 2, 1),
    new Card(img('assets/noface.jpg'), 'Assault Ship', 'Ship firing upon enemy fortress.', '2 damage to castle or target.', 3, 2, CardType.SHIP, 4, 2, 1),
    new Card(img('assets/noface.jpg'), 'Strategic Caravel', 'Caravel repositioning allies or enemies.', 'Move any unit to a chosen position.', 2, 2, CardType.SHIP, 4, 2, 1),

    new Card(img('assets/noface.jpg'), 'Healing Priest', 'Priest restoring an adjacent unit.', 'Heal 2 Life to an adjacent allied unit.', 1, 1, CardType.PRIEST, 3, 2, 1),
    new Card(img('assets/noface.jpg'), 'Inquisitor Priest', 'Priest suppressing enemy magic or abilities.', 'Negate effects (reduce enemy stats).', 1, 1, CardType.PRIEST, 3, 2, 1),

    new Card(img('assets/noface.jpg'), 'Guardian Archangel', 'Angel shielding nearby units.', 'Protect adjacent allies (increase defense).', 2, 2, CardType.ARCHANGEL, 5, 2, 1),
    new Card(img('assets/noface.jpg'), 'Wrath Archangel', 'Angel dealing direct, unstoppable damage.', 'Ignore Defense (direct damage to target).', 3, 2, CardType.ARCHANGEL, 5, 2, 1),

    new Card(img('assets/noface.jpg'), 'Miracle', 'Instant divine restoration for units or castle.', 'Full restore (heal allies to max).', 0, 0, CardType.EFFECT, 0, 0, 0),
    new Card(img('assets/noface.jpg'), 'Total Siege', 'All siege engines strike simultaneously.', 'Catapults attack twice this phase.', 0, 0, CardType.EFFECT, 0, 0, 0),
    new Card(img('assets/noface.jpg'), 'Forced March', 'Army advances faster across the map.', 'Units move +1 this round.', 0, 0, CardType.EFFECT, 0, 0, 0),
    new Card(img('assets/noface.jpg'), 'Betrayal', 'Turn an enemy unit to your side temporarily.', 'Control 1 enemy unit (change ownership).', 0, 0, CardType.EFFECT, 0, 0, 0),

    // 30 explicit reserve soldiers to reach 80 total
    new Card(img('assets/noface.jpg'), 'Reserve Soldier 1', 'Reserve troops called to the front.', 'No special effect.', 1, 1, CardType.SOLDIER, 3, 2, 1),
    new Card(img('assets/noface.jpg'), 'Reserve Soldier 2', 'Reserve troops called to the front.', 'No special effect.', 1, 1, CardType.SOLDIER, 3, 2, 1),
    new Card(img('assets/noface.jpg'), 'Reserve Soldier 3', 'Reserve troops called to the front.', 'No special effect.', 1, 1, CardType.SOLDIER, 3, 2, 1),
    new Card(img('assets/noface.jpg'), 'Reserve Soldier 4', 'Reserve troops called to the front.', 'No special effect.', 1, 1, CardType.SOLDIER, 3, 2, 1),
    new Card(img('assets/noface.jpg'), 'Reserve Soldier 5', 'Reserve troops called to the front.', 'No special effect.', 1, 1, CardType.SOLDIER, 3, 2, 1),
    new Card(img('assets/noface.jpg'), 'Reserve Soldier 6', 'Reserve troops called to the front.', 'No special effect.', 1, 1, CardType.SOLDIER, 3, 2, 1),
    new Card(img('assets/noface.jpg'), 'Reserve Soldier 7', 'Reserve troops called to the front.', 'No special effect.', 1, 1, CardType.SOLDIER, 3, 2, 1),
    new Card(img('assets/noface.jpg'), 'Reserve Soldier 8', 'Reserve troops called to the front.', 'No special effect.', 1, 1, CardType.SOLDIER, 3, 2, 1),
    new Card(img('assets/noface.jpg'), 'Reserve Soldier 9', 'Reserve troops called to the front.', 'No special effect.', 1, 1, CardType.SOLDIER, 3, 2, 1),
    new Card(img('assets/noface.jpg'), 'Reserve Soldier 10', 'Reserve troops called to the front.', 'No special effect.', 1, 1, CardType.SOLDIER, 3, 2, 1),
    new Card(img('assets/noface.jpg'), 'Reserve Soldier 11', 'Reserve troops called to the front.', 'No special effect.', 1, 1, CardType.SOLDIER, 3, 2, 1),
    new Card(img('assets/noface.jpg'), 'Reserve Soldier 12', 'Reserve troops called to the front.', 'No special effect.', 1, 1, CardType.SOLDIER, 3, 2, 1),
    new Card(img('assets/noface.jpg'), 'Reserve Soldier 13', 'Reserve troops called to the front.', 'No special effect.', 1, 1, CardType.SOLDIER, 3, 2, 1),
    new Card(img('assets/noface.jpg'), 'Reserve Soldier 14', 'Reserve troops called to the front.', 'No special effect.', 1, 1, CardType.SOLDIER, 3, 2, 1),
    new Card(img('assets/noface.jpg'), 'Reserve Soldier 15', 'Reserve troops called to the front.', 'No special effect.', 1, 1, CardType.SOLDIER, 3, 2, 1),
    new Card(img('assets/noface.jpg'), 'Reserve Soldier 16', 'Reserve troops called to the front.', 'No special effect.', 1, 1, CardType.SOLDIER, 3, 2, 1),
    new Card(img('assets/noface.jpg'), 'Reserve Soldier 17', 'Reserve troops called to the front.', 'No special effect.', 1, 1, CardType.SOLDIER, 3, 2, 1),
    new Card(img('assets/noface.jpg'), 'Reserve Soldier 18', 'Reserve troops called to the front.', 'No special effect.', 1, 1, CardType.SOLDIER, 3, 2, 1),
    new Card(img('assets/noface.jpg'), 'Reserve Soldier 19', 'Reserve troops called to the front.', 'No special effect.', 1, 1, CardType.SOLDIER, 3, 2, 1),
    new Card(img('assets/noface.jpg'), 'Reserve Soldier 20', 'Reserve troops called to the front.', 'No special effect.', 1, 1, CardType.SOLDIER, 3, 2, 1),
    new Card(img('assets/noface.jpg'), 'Reserve Soldier 21', 'Reserve troops called to the front.', 'No special effect.', 1, 1, CardType.SOLDIER, 3, 2, 1),
    new Card(img('assets/noface.jpg'), 'Reserve Soldier 22', 'Reserve troops called to the front.', 'No special effect.', 1, 1, CardType.SOLDIER, 3, 2, 1),
    new Card(img('assets/noface.jpg'), 'Reserve Soldier 23', 'Reserve troops called to the front.', 'No special effect.', 1, 1, CardType.SOLDIER, 3, 2, 1),
    new Card(img('assets/noface.jpg'), 'Reserve Soldier 24', 'Reserve troops called to the front.', 'No special effect.', 1, 1, CardType.SOLDIER, 3, 2, 1),
    new Card(img('assets/noface.jpg'), 'Reserve Soldier 25', 'Reserve troops called to the front.', 'No special effect.', 1, 1, CardType.SOLDIER, 3, 2, 1),
    new Card(img('assets/noface.jpg'), 'Reserve Soldier 26', 'Reserve troops called to the front.', 'No special effect.', 1, 1, CardType.SOLDIER, 3, 2, 1),
    new Card(img('assets/noface.jpg'), 'Reserve Soldier 27', 'Reserve troops called to the front.', 'No special effect.', 1, 1, CardType.SOLDIER, 3, 2, 1),
    new Card(img('assets/noface.jpg'), 'Reserve Soldier 28', 'Reserve troops called to the front.', 'No special effect.', 1, 1, CardType.SOLDIER, 3, 2, 1),
    new Card(img('assets/noface.jpg'), 'Reserve Soldier 29', 'Reserve troops called to the front.', 'No special effect.', 1, 1, CardType.SOLDIER, 3, 2, 1),
    new Card(img('assets/noface.jpg'), 'Reserve Soldier 30', 'Reserve troops called to the front.', 'No special effect.', 1, 1, CardType.SOLDIER, 3, 2, 1)
  ]

  return withExplicitTaxonomy(cards)
}
