import Card from '../models/Card'
import { createInitialDeck } from '../data/sampleDeck'

class DeckService {
  createDeck(imageFor?: (title: string) => string): Card[] {
    return createInitialDeck(imageFor)
  }
}

const deckService = new DeckService()

export default deckService

export function useDeckService() {
  return deckService
}
