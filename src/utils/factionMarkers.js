import { FACTIONS } from '../data/deckRules'

/**
 * Count faction markers in discard pile
 */
export function getFactionMarkers(discardPile) {
  const markers = { nature: 0, body: 0, pathogen: 0, tech: 0 }
  for (const card of discardPile) {
    if (card?.faction && markers[card.faction] !== undefined) {
      markers[card.faction]++
    }
  }
  return markers
}

/**
 * Check if a card's faction requirement is met
 */
export function canPlayWithMarkers(card, discardPile) {
  if (!card.factionRequirement) return true
  const markers = getFactionMarkers(discardPile)
  return markers[card.factionRequirement.faction] >= card.factionRequirement.count
}

/**
 * Consume faction markers from discard pile (for "consume" type)
 * Returns updated pile with consumed cards removed
 */
export function consumeFactionMarkers(discardPile, faction, count) {
  // Sort by cost ascending - consume lowest cost first
  const factionCards = discardPile
    .filter(c => c.faction === faction)
    .sort((a, b) => a.cost - b.cost)

  const consumed = factionCards.slice(0, count)
  const consumedUids = new Set(consumed.map(c => c.uid || c.id))

  const updatedPile = discardPile.filter(c => !consumedUids.has(c.uid || c.id))
  return { updatedPile, consumed }
}
