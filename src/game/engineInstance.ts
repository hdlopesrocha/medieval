import GameEngine from './GameEngine'
import deckService from '../services/deckService'

const engine = new GameEngine(deckService.createDeck())

export default engine
