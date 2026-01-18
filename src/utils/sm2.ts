import { addDaysISODate, clampNumber } from "./date";

export type ReviewRating = "again" | "hard" | "good" | "easy";

export interface SrsState {
  isNew: boolean;
  dueDateISO: string;
  intervalDays: number;
  easeFactor: number;
  repetitionCount: number;
}

function ratingToQuality(rating: ReviewRating): number {
  // SM-2 expects 0-5. We map our 4 buttons to a common, stable scale.
  switch (rating) {
    case "again":
      return 1;
    case "hard":
      return 3;
    case "good":
      return 4;
    case "easy":
      return 5;
  }
}

export function makeNewSrsState(todayISO: string): SrsState {
  return {
    isNew: true,
    dueDateISO: todayISO,
    intervalDays: 0,
    easeFactor: 2.5,
    repetitionCount: 0,
  };
}

export function applySm2(
  currentState: SrsState,
  rating: ReviewRating,
  todayISO: string
): SrsState {
  const quality = ratingToQuality(rating);

  // Ease factor update (standard SM-2)
  const deltaEase = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
  const nextEaseFactor = clampNumber(currentState.easeFactor + deltaEase, 1.3, 3.0);

  if (quality < 3) {
    // Failed recall: reset repetitions and review soon.
    const retryIntervalDays = 1;
    return {
      ...currentState,
      isNew: false,
      easeFactor: nextEaseFactor,
      repetitionCount: 0,
      intervalDays: retryIntervalDays,
      dueDateISO: addDaysISODate(todayISO, retryIntervalDays),
    };
  }

  const nextRepetitionCount = currentState.repetitionCount + 1;
  let nextIntervalDays: number;

  if (nextRepetitionCount === 1) nextIntervalDays = 1;
  else if (nextRepetitionCount === 2) nextIntervalDays = 6;
  else {
    const rawInterval = Math.round(currentState.intervalDays * nextEaseFactor);
    nextIntervalDays = Math.max(rawInterval, currentState.intervalDays + 1);
  }

  return {
    ...currentState,
    isNew: false,
    easeFactor: nextEaseFactor,
    repetitionCount: nextRepetitionCount,
    intervalDays: nextIntervalDays,
    dueDateISO: addDaysISODate(todayISO, nextIntervalDays),
  };
}
