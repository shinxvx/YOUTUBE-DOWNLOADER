// Which story events are available, and the current objective.
import { EVENTS } from '../content/story.js';
import { hasFlag } from './state.js';

// conditions other than time of day
function baseOk(game, w = {}) {
  if (w.flag && !hasFlag(game, w.flag)) return false;
  if (w.notFlag && hasFlag(game, w.notFlag)) return false;
  return true;
}

function timeOk(game, w = {}) {
  if (w.period && !w.period.includes(game.period)) return false;
  if (w.minDayAfter && !(hasFlag(game, w.minDayAfter) && game.day > game.flags[w.minDayAfter])) return false;
  return true;
}

export function eventAvailable(game, ev) {
  return baseOk(game, ev.when) && timeOk(game, ev.when);
}

export function eventsAt(game, loc) {
  return EVENTS.filter((ev) => !ev.auto && ev.at === loc && eventAvailable(game, ev));
}

// events here that are unlocked but waiting for another time of day
export function waitingAt(game, loc) {
  return EVENTS.filter((ev) => !ev.auto && ev.at === loc && baseOk(game, ev.when) && !timeOk(game, ev.when));
}

export function autoEvent(game) {
  return EVENTS.find((ev) => ev.auto && eventAvailable(game, ev)) || null;
}

export function currentObjective(game) {
  const ev = EVENTS.find((e) => e.essential && !e.auto && baseOk(game, e.when));
  if (!ev) return { text: 'Explore the island freely. More of the story is coming soon.', at: null };
  const ready = timeOk(game, ev.when);
  return { text: ev.objective || ev.label, at: ev.at, ready, wait: ready ? null : ev.waitText };
}

export function hasEventMarker(game, loc) {
  const evs = eventsAt(game, loc);
  if (evs.some((e) => e.essential)) return 'main';
  if (evs.length) return 'side';
  return null;
}
