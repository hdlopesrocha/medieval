import Card from './Card'

export class Deck {
  public cards: Record<number, Card> = {}

  // Compatibility alias expected by consumers
  get cardsById(): Record<string, Card> {
    const out: Record<string, Card> = {}
    for (const k of Object.keys(this.cards || {})) {
      out[String(k)] = this.cards[k as any]
    }
    return out
  }
  set cardsById(v: Record<string, Card>) {
    const out: Record<number, Card> = {}
    for (const k of Object.keys(v || {})) {
      out[Number(k)] = v[k]
    }
    this.cards = out
  }

  constructor(cards?: Card[]) {
    if (cards) {
      for (const c of cards) {
        this.cards[c.id] = c
      }
    }
  }

  save() {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem('tocabola:allCards', JSON.stringify(this.cards))
      } catch (_e) {}
    }
  }

  getIds() {
    return Object.keys(this.cards).map(id => Number(id))
  }

  static load(): Deck | null {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const stored = window.localStorage.getItem('tocabola:allCards')
        if (!stored) return null
        const parsed = JSON.parse(stored)
        const deck = new Deck()
        for (const k of Object.keys(parsed || {})) {
          const payload = parsed[k]
          deck.cards[k] = (Card as any).fromJSON ? (Card as any).fromJSON(payload) : payload
        }
        return deck
      } catch (_e) {
        return null
      }
    }
    return null
  }
}

export default Deck
