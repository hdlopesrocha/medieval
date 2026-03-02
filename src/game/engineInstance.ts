import GameEngine from './GameEngine'
import gameStateService from '../services/gameStateService'
import Card from '../models/Card'
import deckService from '../services/deckService'

gameStateService.ensureDeck('game')
const seedDeck = gameStateService.getDeck('game')
const sourceDeck = seedDeck.length ? seedDeck : deckService.createDeck().map((c: any) => c.toJSON())
const engine = new GameEngine(sourceDeck.map((c: any) => Card.fromJSON(c)))

export default engine
