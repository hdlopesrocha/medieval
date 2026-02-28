import GameEngine from './GameEngine'
import { createInitialDeck } from '../data/sampleDeck'

const engine = new GameEngine(createInitialDeck())

export default engine
