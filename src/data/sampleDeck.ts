import Card, { CardType } from '../models/Card'

// Manually authored initial deck: 80 explicit Card instances.
// Optional `imageFor(title)` callback can provide per-card image URLs.
export function createInitialDeck(imageFor?: (title: string) => string): Card[] {
  const imgFor = (title: string) => (typeof imageFor === 'function' ? imageFor(title) : '') || ''

  const cards: Card[] = [
    new Card('/src/images/afonsohenriques.jpg', 'D. Afonso Henriques', 'First King of Portugal, leading his armies to conquer castles.', '+2 Attack against enemy castle.', 2, 2, CardType.KING, 6, 2, 1),
    new Card('/src/images/dinis.jpg', 'D. Dinis', 'Wise poet king nurturing his lands and troops.', 'Heal 1 Life to all units in Agriculture.', 1, 2, CardType.KING, 6, 2, 1),
    new Card('/src/images/joao1.jpg', 'D. João I', 'Protector of the realm and founder of the House of Avis.', 'Soldiers +1 Defense in Civilization.', 2, 3, CardType.KING, 6, 2, 1),
    new Card('/src/images/joao2.jpg', 'D. João II', 'The “Perfect Prince”, eliminating threats with strategy.', 'Remove 1 enemy unit.', 2, 2, CardType.KING, 5, 2, 1),
    new Card('/src/images/manuel1.jpg', 'D. Manuel I', 'The Expansion King, gaining advantage in every turn.', 'Play 1 extra card.', 1, 2, CardType.KING, 6, 2, 1),
    new Card('/src/images/sebastiao1.jpg', 'D. Sebastião', 'Young king leading brave but risky cavalry charges.', 'Cavalry +2 Attack, lose 1 Life (king).', 3, 1, CardType.KING, 5, 2, 1),
    new Card('/src/images/joao4.jpg', 'D. João IV', 'Restorer of Independence, bringing troops back from defeat.', 'Revive 1 allied unit.', 2, 2, CardType.KING, 6, 2, 1),
    new Card('/src/images/pedro1.jpg', 'D. Pedro I', 'Justice king who punishes enemies when allies fall.', 'Drain 1 Life from enemy (to this unit).', 2, 2, CardType.KING, 5, 2, 1),
    new Card('/src/images/afonso5.jpg', 'D. Afonso V', '“The African” king, swift and aggressive on the battlefield.', 'Cavalry +1 Movement.', 2, 1, CardType.KING, 5, 2, 1),
    new Card('/src/images/joao3.jpg', 'D. João III', 'Inquisitor king, silencing enemy priests.', 'Enemy priests lose effects (reduce their stats).', 1, 2, CardType.KING, 5, 2, 1),
    new Card(imgFor('D. José I'), 'D. José I', 'King overseeing recovery after disasters.', 'Remove all negative effects (heal allies).', 1, 2, CardType.KING, 6, 2, 1),
    new Card(imgFor('D. João VI'), 'D. João VI', 'King who moves troops strategically across the land.', 'Move any allied unit.', 1, 2, CardType.KING, 6, 2, 1),
    new Card(imgFor('D. Pedro IV'), 'D. Pedro IV', 'Liberal king empowering soldiers to strike quickly.', 'Units attack immediately.', 2, 2, CardType.KING, 5, 2, 1),
    new Card(imgFor('D. Miguel I'), 'D. Miguel I', 'Absolutist king forcing the opponent to lose resources.', 'Enemy discards 1 card.', 2, 2, CardType.KING, 5, 2, 1),
    new Card(imgFor('D. Manuel II'), 'D. Manuel II', 'The last king, shielding his forces in retreat.', 'Protect 1 allied unit (+defense).', 2, 2, CardType.KING, 5, 2, 1),

    new Card(imgFor('Santo António de Lisboa'), 'Santo António de Lisboa', 'Patron saint finding lost items, guiding troops.', 'Search any card (draw top deck).', 1, 2, CardType.SAINT, 4, 2, 1),
    new Card(imgFor('Santa Isabel de Portugal'), 'Santa Isabel de Portugal', 'Queen saint spreading blessings and healing.', 'Heal 3 Life to all allies.', 1, 2, CardType.SAINT, 4, 2, 1),
    new Card(imgFor('São João de Deus'), 'São João de Deus', 'Caregiver saint restoring fallen warriors.', 'Revive 1 unit to your castle.', 1, 2, CardType.SAINT, 4, 2, 1),
    new Card(imgFor('São Nuno de Santa Maria'), 'São Nuno de Santa Maria', 'Warrior saint boosting mounted units in battle.', 'Cavalry +2 Attack & +1 Defense.', 2, 2, CardType.SAINT, 5, 2, 1),
    new Card(imgFor('São Vicente'), 'São Vicente', 'Protector of the city, reinforcing fortifications.', 'Castle +3 Health (heal allied in castle).', 1, 2, CardType.SAINT, 4, 2, 1),
    new Card(imgFor('São Francisco Xavier'), 'São Francisco Xavier', 'Missionary saint converting enemy troops.', 'Convert 1 adjacent enemy.', 2, 2, CardType.SAINT, 4, 2, 1),
    new Card(imgFor('Santa Rita de Cássia'), 'Santa Rita de Cássia', 'Performs miracles, bringing units back to life.', 'Revive any card to castle.', 1, 2, CardType.SAINT, 4, 2, 1),
    new Card(imgFor('São Gonçalo de Amarante'), 'São Gonçalo de Amarante', 'Saint connecting allies with shared strength.', '2 units share Life (average HP).', 1, 2, CardType.SAINT, 4, 2, 1),
    new Card(imgFor('Santa Joana Princesa'), 'Santa Joana Princesa', 'Saint sacrificing herself to protect another unit.', 'Sacrifice to save (give +3 HP).', 1, 2, CardType.SAINT, 4, 2, 1),
    new Card(imgFor('São Roque'), 'São Roque', 'Saint warding allies against attacks.', 'Units immune 1 turn (large temporary defense).', 1, 2, CardType.SAINT, 4, 2, 1),
    new Card(imgFor('São Teotónio'), 'São Teotónio', 'First Portuguese saint inspiring new soldiers.', 'Generate 1 Soldier into your castle.', 1, 2, CardType.SAINT, 4, 2, 1),
    new Card(imgFor('São José'), 'São José', 'Saint creating divine protection.', 'Shield a unit (+defense).', 1, 2, CardType.SAINT, 4, 2, 1),
    new Card(imgFor('Santa Luzia'), 'Santa Luzia', 'Saint seeing hidden threats in enemy hand.', 'Reveal & discard (enemy loses a card).', 1, 2, CardType.SAINT, 4, 2, 1),
    new Card(imgFor('São Bento'), 'São Bento', 'Saint banishing enemies with holy authority.', 'Remove 1 enemy unit.', 2, 2, CardType.SAINT, 4, 2, 1),
    new Card(imgFor('Nossa Senhora de Fátima'), 'Nossa Senhora de Fátima', 'Marian apparition protecting allies completely.', 'Heal all & stop attacks (skip enemy attacks next phase).', 1, 2, CardType.SAINT, 5, 2, 1),

    new Card(imgFor('Line Soldier'), 'Line Soldier', 'Frontline soldier taking hits for comrades.', 'Protect ally (taunt-like).', 2, 1, CardType.SOLDIER, 3, 2, 1),
    new Card(imgFor('Siege Soldier'), 'Siege Soldier', 'Soldier specialized in breaking walls.', '+1 Attack vs castle.', 2, 1, CardType.SOLDIER, 3, 2, 1),
    new Card(imgFor('Devoted Soldier'), 'Devoted Soldier', 'Soldier empowered by nearby saints.', 'Heals if a Saint is present nearby.', 2, 1, CardType.SOLDIER, 3, 2, 1),

    new Card(imgFor('Shock Cavalry'), 'Shock Cavalry', 'Fast cavalry striking suddenly at enemies.', 'Move & attack (swift strike).', 3, 1, CardType.CAVALRY, 4, 3, 1),
    new Card(imgFor('Guard Cavalry'), 'Guard Cavalry', 'Cavalry defending key positions.', 'Block first attack (increased defense).', 2, 2, CardType.CAVALRY, 4, 3, 1),
    new Card(imgFor('Wandering Cavalry'), 'Wandering Cavalry', 'Cavalry deciding between offense or support.', 'Heal or damage a target (ally heal or enemy damage).', 2, 2, CardType.CAVALRY, 4, 3, 1),

    new Card(imgFor('Siege Catapult'), 'Siege Catapult', 'Heavy catapult pounding castle walls.', '+4 vs castle (high damage to castle units).', 4, 0, CardType.CATAPULT, 3, 1, 1),
    new Card(imgFor('Fire Catapult'), 'Fire Catapult', 'Catapult raining fire on multiple enemies.', 'Area damage to nearby enemies.', 3, 0, CardType.CATAPULT, 3, 1, 1),
    new Card(imgFor('Destruction Catapult'), 'Destruction Catapult', 'Catapult destroying defenses and fortifications.', 'Remove shields (reduce enemy defense).', 4, 0, CardType.CATAPULT, 3, 1, 1),

    new Card(imgFor('Transport Ship'), 'Transport Ship', 'Ship transporting troops across water.', 'Move land unit (transport to new position).', 1, 2, CardType.SHIP, 4, 2, 1),
    new Card(imgFor('Assault Ship'), 'Assault Ship', 'Ship firing upon enemy fortress.', '2 damage to castle or target.', 3, 2, CardType.SHIP, 4, 2, 1),
    new Card(imgFor('Strategic Caravel'), 'Strategic Caravel', 'Caravel repositioning allies or enemies.', 'Move any unit to a chosen position.', 2, 2, CardType.SHIP, 4, 2, 1),

    new Card(imgFor('Healing Priest'), 'Healing Priest', 'Priest restoring an adjacent unit.', 'Heal 2 Life to an adjacent allied unit.', 1, 1, CardType.PRIEST, 3, 2, 1),
    new Card(imgFor('Inquisitor Priest'), 'Inquisitor Priest', 'Priest suppressing enemy magic or abilities.', 'Negate effects (reduce enemy stats).', 1, 1, CardType.PRIEST, 3, 2, 1),

    new Card(imgFor('Guardian Archangel'), 'Guardian Archangel', 'Angel shielding nearby units.', 'Protect adjacent allies (increase defense).', 2, 2, CardType.ARCHANGEL, 5, 2, 1),
    new Card(imgFor('Wrath Archangel'), 'Wrath Archangel', 'Angel dealing direct, unstoppable damage.', 'Ignore Defense (direct damage to target).', 3, 2, CardType.ARCHANGEL, 5, 2, 1),

    new Card(imgFor('Miracle'), 'Miracle', 'Instant divine restoration for units or castle.', 'Full restore (heal allies to max).', 0, 0, CardType.EFFECT, 0, 0, 0),
    new Card(imgFor('Total Siege'), 'Total Siege', 'All siege engines strike simultaneously.', 'Catapults attack twice this phase.', 0, 0, CardType.EFFECT, 0, 0, 0),
    new Card(imgFor('Forced March'), 'Forced March', 'Army advances faster across the map.', 'Units move +1 this round.', 0, 0, CardType.EFFECT, 0, 0, 0),
    new Card(imgFor('Betrayal'), 'Betrayal', 'Turn an enemy unit to your side temporarily.', 'Control 1 enemy unit (change ownership).', 0, 0, CardType.EFFECT, 0, 0, 0),

    // 30 explicit reserve soldiers to reach 80 total
    new Card(imgFor('Reserve Soldier 1'), 'Reserve Soldier 1', 'Reserve troops called to the front.', 'No special effect.', 1, 1, CardType.SOLDIER, 3, 2, 1),
    new Card(imgFor('Reserve Soldier 2'), 'Reserve Soldier 2', 'Reserve troops called to the front.', 'No special effect.', 1, 1, CardType.SOLDIER, 3, 2, 1),
    new Card(imgFor('Reserve Soldier 3'), 'Reserve Soldier 3', 'Reserve troops called to the front.', 'No special effect.', 1, 1, CardType.SOLDIER, 3, 2, 1),
    new Card(imgFor('Reserve Soldier 4'), 'Reserve Soldier 4', 'Reserve troops called to the front.', 'No special effect.', 1, 1, CardType.SOLDIER, 3, 2, 1),
    new Card(imgFor('Reserve Soldier 5'), 'Reserve Soldier 5', 'Reserve troops called to the front.', 'No special effect.', 1, 1, CardType.SOLDIER, 3, 2, 1),
    new Card(imgFor('Reserve Soldier 6'), 'Reserve Soldier 6', 'Reserve troops called to the front.', 'No special effect.', 1, 1, CardType.SOLDIER, 3, 2, 1),
    new Card(imgFor('Reserve Soldier 7'), 'Reserve Soldier 7', 'Reserve troops called to the front.', 'No special effect.', 1, 1, CardType.SOLDIER, 3, 2, 1),
    new Card(imgFor('Reserve Soldier 8'), 'Reserve Soldier 8', 'Reserve troops called to the front.', 'No special effect.', 1, 1, CardType.SOLDIER, 3, 2, 1),
    new Card(imgFor('Reserve Soldier 9'), 'Reserve Soldier 9', 'Reserve troops called to the front.', 'No special effect.', 1, 1, CardType.SOLDIER, 3, 2, 1),
    new Card(imgFor('Reserve Soldier 10'), 'Reserve Soldier 10', 'Reserve troops called to the front.', 'No special effect.', 1, 1, CardType.SOLDIER, 3, 2, 1),
    new Card(imgFor('Reserve Soldier 11'), 'Reserve Soldier 11', 'Reserve troops called to the front.', 'No special effect.', 1, 1, CardType.SOLDIER, 3, 2, 1),
    new Card(imgFor('Reserve Soldier 12'), 'Reserve Soldier 12', 'Reserve troops called to the front.', 'No special effect.', 1, 1, CardType.SOLDIER, 3, 2, 1),
    new Card(imgFor('Reserve Soldier 13'), 'Reserve Soldier 13', 'Reserve troops called to the front.', 'No special effect.', 1, 1, CardType.SOLDIER, 3, 2, 1),
    new Card(imgFor('Reserve Soldier 14'), 'Reserve Soldier 14', 'Reserve troops called to the front.', 'No special effect.', 1, 1, CardType.SOLDIER, 3, 2, 1),
    new Card(imgFor('Reserve Soldier 15'), 'Reserve Soldier 15', 'Reserve troops called to the front.', 'No special effect.', 1, 1, CardType.SOLDIER, 3, 2, 1),
    new Card(imgFor('Reserve Soldier 16'), 'Reserve Soldier 16', 'Reserve troops called to the front.', 'No special effect.', 1, 1, CardType.SOLDIER, 3, 2, 1),
    new Card(imgFor('Reserve Soldier 17'), 'Reserve Soldier 17', 'Reserve troops called to the front.', 'No special effect.', 1, 1, CardType.SOLDIER, 3, 2, 1),
    new Card(imgFor('Reserve Soldier 18'), 'Reserve Soldier 18', 'Reserve troops called to the front.', 'No special effect.', 1, 1, CardType.SOLDIER, 3, 2, 1),
    new Card(imgFor('Reserve Soldier 19'), 'Reserve Soldier 19', 'Reserve troops called to the front.', 'No special effect.', 1, 1, CardType.SOLDIER, 3, 2, 1),
    new Card(imgFor('Reserve Soldier 20'), 'Reserve Soldier 20', 'Reserve troops called to the front.', 'No special effect.', 1, 1, CardType.SOLDIER, 3, 2, 1),
    new Card(imgFor('Reserve Soldier 21'), 'Reserve Soldier 21', 'Reserve troops called to the front.', 'No special effect.', 1, 1, CardType.SOLDIER, 3, 2, 1),
    new Card(imgFor('Reserve Soldier 22'), 'Reserve Soldier 22', 'Reserve troops called to the front.', 'No special effect.', 1, 1, CardType.SOLDIER, 3, 2, 1),
    new Card(imgFor('Reserve Soldier 23'), 'Reserve Soldier 23', 'Reserve troops called to the front.', 'No special effect.', 1, 1, CardType.SOLDIER, 3, 2, 1),
    new Card(imgFor('Reserve Soldier 24'), 'Reserve Soldier 24', 'Reserve troops called to the front.', 'No special effect.', 1, 1, CardType.SOLDIER, 3, 2, 1),
    new Card(imgFor('Reserve Soldier 25'), 'Reserve Soldier 25', 'Reserve troops called to the front.', 'No special effect.', 1, 1, CardType.SOLDIER, 3, 2, 1),
    new Card(imgFor('Reserve Soldier 26'), 'Reserve Soldier 26', 'Reserve troops called to the front.', 'No special effect.', 1, 1, CardType.SOLDIER, 3, 2, 1),
    new Card(imgFor('Reserve Soldier 27'), 'Reserve Soldier 27', 'Reserve troops called to the front.', 'No special effect.', 1, 1, CardType.SOLDIER, 3, 2, 1),
    new Card(imgFor('Reserve Soldier 28'), 'Reserve Soldier 28', 'Reserve troops called to the front.', 'No special effect.', 1, 1, CardType.SOLDIER, 3, 2, 1),
    new Card(imgFor('Reserve Soldier 29'), 'Reserve Soldier 29', 'Reserve troops called to the front.', 'No special effect.', 1, 1, CardType.SOLDIER, 3, 2, 1),
    new Card(imgFor('Reserve Soldier 30'), 'Reserve Soldier 30', 'Reserve troops called to the front.', 'No special effect.', 1, 1, CardType.SOLDIER, 3, 2, 1)
  ]

  return cards
}
