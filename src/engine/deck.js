// Deck-building rules: exactly 30 cards, at most 2 copies (1 for legendaries),
// at least 8 basic creatures.
import { CARDS, isBasicCreature } from '../content/cards.js';

export const DECK_SIZE = 30;
export const MIN_BASICS = 8;

export function validateDeck(ids, owned = null) {
  const problems = [];
  if (ids.length !== DECK_SIZE) problems.push(`A deck needs exactly ${DECK_SIZE} cards (now ${ids.length}).`);
  const counts = {};
  for (const id of ids) counts[id] = (counts[id] || 0) + 1;
  for (const [id, n] of Object.entries(counts)) {
    const c = CARDS[id];
    if (!c) {
      problems.push(`Unknown card: ${id}.`);
      continue;
    }
    if (n > c.maxCopies) problems.push(`${c.name}: at most ${c.maxCopies} ${c.maxCopies === 1 ? 'copy' : 'copies'}.`);
    if (owned && n > (owned[id] || 0)) problems.push(`${c.name}: you only own ${owned[id] || 0}.`);
  }
  const basics = ids.filter((id) => CARDS[id] && isBasicCreature(CARDS[id])).length;
  if (basics < MIN_BASICS) problems.push(`At least ${MIN_BASICS} basic creatures are needed (now ${basics}).`);
  return { ok: problems.length === 0, problems, basics };
}
