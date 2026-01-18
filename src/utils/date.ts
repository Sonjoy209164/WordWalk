export function toISODate(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDaysISODate(dateISO: string, daysToAdd: number): string {
  const [yearStr, monthStr, dayStr] = dateISO.split("-");
  const baseDate = new Date(Number(yearStr), Number(monthStr) - 1, Number(dayStr));
  baseDate.setDate(baseDate.getDate() + daysToAdd);
  return toISODate(baseDate);
}

export function isISODateBeforeOrEqual(leftISO: string, rightISO: string): boolean {
  // Works because ISO date strings sort lexicographically.
  return leftISO <= rightISO;
}

export function isYesterday(lastDateISO: string, todayISO: string): boolean {
  return lastDateISO === addDaysISODate(todayISO, -1);
}

export function clampNumber(value: number, minValue: number, maxValue: number): number {
  return Math.max(minValue, Math.min(maxValue, value));
}
