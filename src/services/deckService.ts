import Card from '../models/Card'
import { createInitialDeck } from '../data/sampleDeck'

class DeckService {
  createDeck(): Card[] {
    const initialDeck = createInitialDeck()
    return initialDeck
  }
}

const deckService = new DeckService()

export default deckService

export function useDeckService() {
  return deckService
}
