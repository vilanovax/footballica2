/**
 * Hot-path match clocks — mutated every animation frame without Zustand/React.
 * Timer UI reads these imperatively; store state only syncs on discrete events
 * (start, answer, next, helper, timeout).
 */

let penaltyTimeLeftMs = 0;
let survivalTimeLeftMs = 0;

export function getPenaltyLiveTimeLeftMs(): number {
  return penaltyTimeLeftMs;
}

export function setPenaltyLiveTimeLeftMs(ms: number): void {
  penaltyTimeLeftMs = Math.max(0, ms);
}

export function getSurvivalLiveTimeLeftMs(): number {
  return survivalTimeLeftMs;
}

export function setSurvivalLiveTimeLeftMs(ms: number): void {
  survivalTimeLeftMs = Math.max(0, ms);
}
