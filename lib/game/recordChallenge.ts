/**
 * Premium RecordChallenge helpers — framework-free so settle + UI agree.
 */

export type RecordChallengeWindow = {
  isActive: boolean;
  startsAt: Date;
  expiresAt: Date | null;
};

/** True when the challenge is live for play right now. */
export function isRecordChallengeLive(
  challenge: RecordChallengeWindow,
  now: Date = new Date(),
): boolean {
  if (!challenge.isActive) return false;
  if (challenge.startsAt.getTime() > now.getTime()) return false;
  if (
    challenge.expiresAt != null &&
    challenge.expiresAt.getTime() <= now.getTime()
  ) {
    return false;
  }
  return true;
}

export function isChallengeTargetMet(
  score: number,
  targetScore: number,
): boolean {
  return Math.max(0, Math.floor(score)) >= Math.max(1, Math.floor(targetScore));
}
