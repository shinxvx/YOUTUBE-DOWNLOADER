// Who is present at a location right now.
import { SCHEDULE, INTRO_FLAG } from '../content/world.js';
import { hasFlag } from './state.js';
import { eventsAt } from './events.js';

export function peopleAt(game, loc) {
  const out = [];
  for (const [who, sched] of Object.entries(SCHEDULE)) {
    if (sched[game.period] !== loc) continue;
    const intro = INTRO_FLAG[who];
    if (intro && !hasFlag(game, intro)) continue;
    out.push(who);
  }
  for (const ev of eventsAt(game, loc)) for (const p of ev.people || []) if (!out.includes(p)) out.push(p);
  return out;
}
