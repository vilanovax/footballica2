/**
 * Question-format content contracts (ADR 001).
 * Stored inside each locale block of Question.content alongside text/options.
 */

export type CareerPathStep = {
  /** Club / stop display name for this locale. */
  name: string;
  logoUrl?: string | null;
};

export type CareerPathPayload = {
  /** Ordered career stops (min 2). */
  steps: CareerPathStep[];
};

export type HigherLowerEntity = {
  name: string;
  imageUrl?: string | null;
};

export type HigherLowerPayload = {
  left: HigherLowerEntity;
  right: HigherLowerEntity;
  /** e.g. "Career goals", "گل ملی" */
  metricLabel: string;
};

/** Normalize optional career-path blob from DB/admin JSON. */
export function parseCareerPath(raw: unknown): CareerPathPayload | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const stepsRaw = (raw as { steps?: unknown }).steps;
  if (!Array.isArray(stepsRaw) || stepsRaw.length < 2) return undefined;
  const steps: CareerPathStep[] = [];
  for (const s of stepsRaw) {
    if (!s || typeof s !== "object") continue;
    const name = typeof (s as { name?: unknown }).name === "string"
      ? (s as { name: string }).name.trim()
      : "";
    if (!name) continue;
    const logoUrl =
      typeof (s as { logoUrl?: unknown }).logoUrl === "string"
        ? (s as { logoUrl: string }).logoUrl.trim() || null
        : null;
    steps.push({ name, logoUrl });
  }
  return steps.length >= 2 ? { steps } : undefined;
}

export function parseHigherLower(raw: unknown): HigherLowerPayload | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const left = o.left;
  const right = o.right;
  const metricLabel =
    typeof o.metricLabel === "string" ? o.metricLabel.trim() : "";
  if (!metricLabel || !left || !right || typeof left !== "object" || typeof right !== "object") {
    return undefined;
  }
  const leftName =
    typeof (left as { name?: unknown }).name === "string"
      ? (left as { name: string }).name.trim()
      : "";
  const rightName =
    typeof (right as { name?: unknown }).name === "string"
      ? (right as { name: string }).name.trim()
      : "";
  if (!leftName || !rightName) return undefined;
  const leftImg =
    typeof (left as { imageUrl?: unknown }).imageUrl === "string"
      ? (left as { imageUrl: string }).imageUrl.trim() || null
      : null;
  const rightImg =
    typeof (right as { imageUrl?: unknown }).imageUrl === "string"
      ? (right as { imageUrl: string }).imageUrl.trim() || null
      : null;
  return {
    left: { name: leftName, imageUrl: leftImg },
    right: { name: rightName, imageUrl: rightImg },
    metricLabel,
  };
}
