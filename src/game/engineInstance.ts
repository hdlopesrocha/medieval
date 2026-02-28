import GameEngine from './GameEngine'
import createSampleDeck from '../data/sampleDeck'

const engine = new GameEngine(createSampleDeck())

export default engine
