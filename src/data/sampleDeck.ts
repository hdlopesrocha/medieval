import Card, { CardType } from '../models/Card'

// Helper to create named copies with random HP (5..10)
function makeNamedCopies(base: { imageUrl: string | string[]; description: string; attack: number; defense: number; type: CardType; velocity: number; range: number }, names: string[]) {
  const arr: Card[] = []
  for (let i = 0; i < names.length; i++) {
    const randomHp = Math.floor(Math.random() * 6) + 5 // 5..10
    const img = Array.isArray(base.imageUrl) ? base.imageUrl[i % base.imageUrl.length] : base.imageUrl
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
        base.range
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



// Initial deck based on provided roster
export function createInitialDeck(): Card[] {
  return [
    new Card('', 'D. Afonso Henriques', 'First King of Portugal, leading his armies to conquer castles.', '+2 Attack against enemy castle.', 2, 2, CardType.KING, 6, 2, 1),
    new Card('', 'D. Dinis', 'Wise poet king nurturing his lands and troops.', 'Heal 1 Life to all units in Agriculture.', 1, 2, CardType.KING, 6, 2, 1),
    new Card('', 'D. João I', 'Protector of the realm and founder of the House of Avis.', 'Soldiers +1 Defense in Civilization.', 2, 3, CardType.KING, 6, 2, 1),
    new Card('', 'D. João II', 'The “Perfect Prince”, eliminating threats with strategy.', 'Remove 1 enemy unit.', 2, 2, CardType.KING, 5, 2, 1),
    new Card('', 'D. Manuel I', 'The Expansion King, gaining advantage in every turn.', 'Play 1 extra card.', 1, 2, CardType.KING, 6, 2, 1),
    new Card('', 'D. Sebastião', 'Young king leading brave but risky cavalry charges.', 'Cavalry +2 Attack, lose 1 Life (king).', 3, 1, CardType.KING, 5, 2, 1),
    new Card('', 'D. João IV', 'Restorer of Independence, bringing troops back from defeat.', 'Revive 1 allied unit.', 2, 2, CardType.KING, 6, 2, 1),
    new Card('', 'D. Pedro I', 'Justice king who punishes enemies when allies fall.', 'Drain 1 Life from enemy (to this unit).', 2, 2, CardType.KING, 5, 2, 1),
    new Card('', 'D. Afonso V', '“The African” king, swift and aggressive on the battlefield.', 'Cavalry +1 Movement.', 2, 1, CardType.KING, 5, 2, 1),
    new Card('', 'D. João III', 'Inquisitor king, silencing enemy priests.', 'Enemy priests lose effects (reduce their stats).', 1, 2, CardType.KING, 5, 2, 1),
    new Card('', 'D. José I', 'King overseeing recovery after disasters.', 'Remove all negative effects (heal allies).', 1, 2, CardType.KING, 6, 2, 1),
    new Card('', 'D. João VI', 'King who moves troops strategically across the land.', 'Move any allied unit.', 1, 2, CardType.KING, 6, 2, 1),
    new Card('', 'D. Pedro IV', 'Liberal king empowering soldiers to strike quickly.', 'Units attack immediately.', 2, 2, CardType.KING, 5, 2, 1),
    new Card('', 'D. Miguel I', 'Absolutist king forcing the opponent to lose resources.', 'Enemy discards 1 card.', 2, 2, CardType.KING, 5, 2, 1),
    new Card('', 'D. Manuel II', 'The last king, shielding his forces in retreat.', 'Protect 1 allied unit (+defense).', 2, 2, CardType.KING, 5, 2, 1),
    new Card('', 'Santo António de Lisboa', 'Patron saint finding lost items, guiding troops.', 'Search any card (draw top deck).', 1, 2, CardType.SAINT, 4, 2, 1),
    new Card('', 'Santa Isabel de Portugal', 'Queen saint spreading blessings and healing.', 'Heal 3 Life to all allies.', 1, 2, CardType.SAINT, 4, 2, 1),
    new Card('', 'São João de Deus', 'Caregiver saint restoring fallen warriors.', 'Revive 1 unit to your castle.', 1, 2, CardType.SAINT, 4, 2, 1),
    new Card('', 'São Nuno de Santa Maria', 'Warrior saint boosting mounted units in battle.', 'Cavalry +2 Attack & +1 Defense.', 2, 2, CardType.SAINT, 5, 2, 1),
    new Card('', 'São Vicente', 'Protector of the city, reinforcing fortifications.', 'Castle +3 Health (heal allied in castle).', 1, 2, CardType.SAINT, 4, 2, 1),
    new Card('', 'São Francisco Xavier', 'Missionary saint converting enemy troops.', 'Convert 1 adjacent enemy.', 2, 2, CardType.SAINT, 4, 2, 1),
    new Card('', 'Santa Rita de Cássia', 'Performs miracles, bringing units back to life.', 'Revive any card to castle.', 1, 2, CardType.SAINT, 4, 2, 1),
    new Card('', 'São Gonçalo de Amarante', 'Saint connecting allies with shared strength.', '2 units share Life (average HP).', 1, 2, CardType.SAINT, 4, 2, 1),
    new Card('', 'Santa Joana Princesa', 'Saint sacrificing herself to protect another unit.', 'Sacrifice to save (give +3 HP).', 1, 2, CardType.SAINT, 4, 2, 1),
    new Card('', 'São Roque', 'Saint warding allies against attacks.', 'Units immune 1 turn (large temporary defense).', 1, 2, CardType.SAINT, 4, 2, 1),
    new Card('', 'São Teotónio', 'First Portuguese saint inspiring new soldiers.', 'Generate 1 Soldier into your castle.', 1, 2, CardType.SAINT, 4, 2, 1),
    new Card('', 'São José', 'Saint creating divine protection.', 'Shield a unit (+defense).', 1, 2, CardType.SAINT, 4, 2, 1),
    new Card('', 'Santa Luzia', 'Saint seeing hidden threats in enemy hand.', 'Reveal & discard (enemy loses a card).', 1, 2, CardType.SAINT, 4, 2, 1),
    new Card('', 'São Bento', 'Saint banishing enemies with holy authority.', 'Remove 1 enemy unit.', 2, 2, CardType.SAINT, 4, 2, 1),
    new Card('', 'Nossa Senhora de Fátima', 'Marian apparition protecting allies completely.', 'Heal all & stop attacks (skip enemy attacks next phase).', 1, 2, CardType.SAINT, 5, 2, 1),
    new Card('', 'Line Soldier', 'Frontline soldier taking hits for comrades.', 'Protect ally (taunt-like).', 2, 1, CardType.SOLDIER, 3, 2, 1),
    new Card('', 'Siege Soldier', 'Soldier specialized in breaking walls.', '+1 Attack vs castle.', 2, 1, CardType.SOLDIER, 3, 2, 1),
    new Card('', 'Devoted Soldier', 'Soldier empowered by nearby saints.', 'Heals if a Saint is present nearby.', 2, 1, CardType.SOLDIER, 3, 2, 1),
    new Card('', 'Shock Cavalry', 'Fast cavalry striking suddenly at enemies.', 'Move & attack (swift strike).', 3, 1, CardType.CAVALRY, 4, 3, 1),
    new Card('', 'Guard Cavalry', 'Cavalry defending key positions.', 'Block first attack (increased defense).', 2, 2, CardType.CAVALRY, 4, 3, 1),
    new Card('', 'Wandering Cavalry', 'Cavalry deciding between offense or support.', 'Heal or damage a target (ally heal or enemy damage).', 2, 2, CardType.CAVALRY, 4, 3, 1),
    new Card('', 'Siege Catapult', 'Heavy catapult pounding castle walls.', '+4 vs castle (high damage to castle units).', 4, 0, CardType.CATAPULT, 3, 1, 1),
    new Card('', 'Fire Catapult', 'Catapult raining fire on multiple enemies.', 'Area damage to nearby enemies.', 3, 0, CardType.CATAPULT, 3, 1, 1),
    new Card('', 'Destruction Catapult', 'Catapult destroying defenses and fortifications.', 'Remove shields (reduce enemy defense).', 4, 0, CardType.CATAPULT, 3, 1, 1),
    new Card('', 'Transport Ship', 'Ship transporting troops across water.', 'Move land unit (transport to new position).', 1, 2, CardType.SHIP, 4, 2, 1),
    new Card('', 'Assault Ship', 'Ship firing upon enemy fortress.', '2 damage to castle or target.', 3, 2, CardType.SHIP, 4, 2, 1),
    new Card('', 'Strategic Caravel', 'Caravel repositioning allies or enemies.', 'Move any unit to a chosen position.', 2, 2, CardType.SHIP, 4, 2, 1),
    new Card('', 'Healing Priest', 'Priest restoring an adjacent unit.', 'Heal 2 Life to an adjacent allied unit.', 1, 1, CardType.PRIEST, 3, 2, 1),
    new Card('', 'Inquisitor Priest', 'Priest suppressing enemy magic or abilities.', 'Negate effects (reduce enemy stats).', 1, 1, CardType.PRIEST, 3, 2, 1),
    new Card('', 'Guardian Archangel', 'Angel shielding nearby units.', 'Protect adjacent allies (increase defense).', 2, 2, CardType.ARCHANGEL, 5, 2, 1),
    new Card('', 'Wrath Archangel', 'Angel dealing direct, unstoppable damage.', 'Ignore Defense (direct damage to target).', 3, 2, CardType.ARCHANGEL, 5, 2, 1),
    new Card('', 'Miracle', 'Instant divine restoration for units or castle.', 'Full restore (heal allies to max).', 0, 0, CardType.EFFECT, 0, 0, 0),
    new Card('', 'Total Siege', 'All siege engines strike simultaneously.', 'Catapults attack twice this phase.', 0, 0, CardType.EFFECT, 0, 0, 0),
    new Card('', 'Forced March', 'Army advances faster across the map.', 'Units move +1 this round.', 0, 0, CardType.EFFECT, 0, 0, 0),
    new Card('', 'Betrayal', 'Turn an enemy unit to your side temporarily.', 'Control 1 enemy unit (change ownership).', 0, 0, CardType.EFFECT, 0, 0, 0)
  ]}
