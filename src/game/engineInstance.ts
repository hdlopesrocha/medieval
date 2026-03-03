import GameEngine from './GameEngine'
// import GameContext from '../models/GameContext' if needed
import Card from '../models/Card'
import deckService from '../services/deckService'

const sourceDeck = deckService.createDeck()
const engine = new GameEngine(sourceDeck)

export default engine
