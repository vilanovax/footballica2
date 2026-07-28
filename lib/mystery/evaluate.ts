import type {
  AttributeVerdict,
  CompareVerdict,
  MysteryGuessRecord,
  MysteryPlayer,
  MysteryPosition,
} from "./types";

const POSITION_LINE: Record<MysteryPosition, number> = {
  GK: 0,
  DEF: 1,
  MID: 2,
  FWD: 3,
};

function attrExact(a: string, b: string): AttributeVerdict {
  return a === b ? "correct" : "wrong";
}

function positionVerdict(
  guess: MysteryPosition,
  target: MysteryPosition,
): AttributeVerdict {
  if (guess === target) return "correct";
  // Adjacent lines (DEF↔MID, MID↔FWD) count as "close".
  if (Math.abs(POSITION_LINE[guess] - POSITION_LINE[target]) === 1) {
    return "close";
  }
  return "wrong";
}

function compareNum(guess: number, target: number): CompareVerdict {
  if (guess === target) return "correct";
  // Direction tells the player where the secret value sits relative to the guess.
  return guess < target ? "higher" : "lower";
}

/** Build a guess ledger row comparing `guessed` against the day's `target`. */
export function evaluateMysteryGuess(
  guessed: MysteryPlayer,
  target: MysteryPlayer,
  at: Date = new Date(),
): MysteryGuessRecord {
  return {
    playerId: guessed.id,
    nameEn: guessed.nameEn,
    nameFa: guessed.nameFa,
    nationality: attrExact(guessed.nationality, target.nationality),
    position: positionVerdict(guessed.position, target.position),
    league: attrExact(guessed.league, target.league),
    club: attrExact(guessed.club, target.club),
    age: compareNum(guessed.age, target.age),
    shirtNumber: compareNum(guessed.shirtNumber, target.shirtNumber),
    isCorrect: guessed.id === target.id,
    at: at.toISOString(),
  };
}
