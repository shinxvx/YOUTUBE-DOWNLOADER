// Small seeded RNG (mulberry32). The state is a plain number so duels can be
// cloned, saved and replayed deterministically.
export function nextRandom(holder) {
  holder.rng = (holder.rng + 0x6d2b79f5) >>> 0;
  let t = holder.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function randInt(holder, n) {
  return Math.floor(nextRandom(holder) * n);
}

export function shuffle(holder, arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randInt(holder, i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function seedFrom(text) {
  let h = 2166136261;
  for (const ch of String(text)) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
