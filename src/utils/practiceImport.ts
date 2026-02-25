export type PracticeImportItem = {
  number: number;
  prompt: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
};

export type PracticeImportSkip = { number: number; reason: string };

export type PracticeImportResult =
  | { ok: true; items: PracticeImportItem[]; skipped: PracticeImportSkip[] }
  | { ok: false; error: string };

const QC_CHOICES = [
  "Quantity A is greater.",
  "Quantity B is greater.",
  "The two quantities are equal.",
  "The relationship cannot be determined from the information given.",
];

type AnswerKeyEntry =
  | { kind: "letter"; correctLetter: "A" | "B" | "C" | "D" | "E"; explanation: string }
  | { kind: "numeric"; answerToken: string; explanation: string }
  | { kind: "multi"; answerToken: string; explanation: string };

function normalizeNewlines(input: string): string {
  return (input ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function trimAndCollapseBlankLines(text: string): string {
  const lines = normalizeNewlines(text)
    .split("\n")
    .map((l) => l.replace(/[ \t]+$/g, "")); // trim end only, preserve indentation

  const out: string[] = [];
  let lastWasBlank = true;
  for (const raw of lines) {
    const isBlank = raw.trim().length === 0;
    if (isBlank) {
      if (!lastWasBlank) out.push("");
      lastWasBlank = true;
      continue;
    }
    out.push(raw);
    lastWasBlank = false;
  }

  // trim leading/trailing blanks
  while (out.length > 0 && out[0].trim().length === 0) out.shift();
  while (out.length > 0 && out[out.length - 1].trim().length === 0) out.pop();
  return out.join("\n").trim();
}

function parseNumberedBlocks(lines: string[]): Array<{ number: number; lines: string[] }> {
  const blocks: Array<{ number: number; lines: string[] }> = [];
  let current: { number: number; lines: string[] } | null = null;

  for (const line of lines) {
    const m = line.match(/^\s*(\d{1,3})\s*\.\s*(.*)$/);
    if (m) {
      if (current) blocks.push(current);
      const number = Number.parseInt(m[1], 10);
      if (!Number.isFinite(number)) {
        current = null;
        continue;
      }
      current = { number, lines: [] };
      const rest = (m[2] ?? "").trimEnd();
      if (rest) current.lines.push(rest);
      continue;
    }
    if (!current) continue;
    current.lines.push(line);
  }

  if (current) blocks.push(current);
  return blocks;
}

function splitQuestionAndAnswerSections(text: string): { questionText: string; answerText: string } {
  const raw = normalizeNewlines(text).trim();
  if (!raw) return { questionText: "", answerText: "" };

  const lines = raw.split("\n");
  const answersIdx = lines.findIndex((l) => /answers/i.test(l) && !/^\s*\d{1,3}\s*\./.test(l));
  if (answersIdx < 0) return { questionText: raw, answerText: "" };

  const questionText = lines.slice(0, answersIdx).join("\n").trim();
  const answerText = lines.slice(answersIdx + 1).join("\n").trim();
  return { questionText, answerText };
}

function parseAnswerKey(answerText: string): Map<number, AnswerKeyEntry> {
  const map = new Map<number, AnswerKeyEntry>();
  const lines = normalizeNewlines(answerText).split("\n");
  const blocks = parseNumberedBlocks(lines);

  for (const b of blocks) {
    const body = trimAndCollapseBlankLines(b.lines.join("\n"));
    if (!body) continue;

    const letterMatch = body.match(/^\s*\(([A-E])\)\s*\.?\s*([\s\S]*)$/);
    if (letterMatch) {
      const correctLetter = letterMatch[1] as "A" | "B" | "C" | "D" | "E";
      const explanation = (letterMatch[2] ?? "").trim();
      map.set(b.number, { kind: "letter", correctLetter, explanation });
      continue;
    }

    // Numeric-style: "147. Explanation..." or "$2,575. Explanation..." or "144 kilometers. Explanation..."
    const numHead = body.match(/^\s*([$€£]?)(-?\d[\d,]*(?:\.\d+)?)([^\n.]*)/);
    if (numHead) {
      const prefix = (numHead[1] ?? "").trim();
      const num = (numHead[2] ?? "").trim();
      const tail = (numHead[3] ?? "").trim();
      const answerToken = `${prefix}${num}${tail ? ` ${tail}` : ""}`.trim();

      const numericTokens = answerToken.match(/-?\d[\d,]*(?:\.\d+)?/g) ?? [];
      const rest = body.slice(numHead[0].length).replace(/^\s*\.\s*/, "").trim();

      if (numericTokens.length > 1) {
        map.set(b.number, { kind: "multi", answerToken, explanation: rest });
      } else {
        map.set(b.number, { kind: "numeric", answerToken, explanation: rest });
      }
    }
  }

  return map;
}

function isQcBlock(lines: string[]): boolean {
  const joined = lines.map((l) => l.trim().toLowerCase());
  return joined.some((l) => l === "quantity a" || l.startsWith("quantity a")) && joined.some((l) => l === "quantity b" || l.startsWith("quantity b"));
}

function parseQcPrompt(lines: string[]): { ok: true; prompt: string } | { ok: false; error: string } {
  const normalized = lines.map((l) => l.replace(/[ \t]+$/g, ""));
  const idxA = normalized.findIndex((l) => l.trim().toLowerCase().startsWith("quantity a"));
  const idxB = normalized.findIndex((l) => l.trim().toLowerCase().startsWith("quantity b"));
  if (idxA < 0 || idxB < 0 || idxA >= idxB) return { ok: false, error: "Could not find Quantity A/B." };

  const preStem = trimAndCollapseBlankLines(normalized.slice(0, idxA).join("\n"));
  const aText = trimAndCollapseBlankLines(normalized.slice(idxA + 1, idxB).join("\n"));
  const bText = trimAndCollapseBlankLines(normalized.slice(idxB + 1).join("\n"));

  const parts: string[] = [];
  if (preStem) parts.push(preStem);
  parts.push(`Quantity A\n${aText || "…"}`);
  parts.push(`Quantity B\n${bText || "…"}`);

  return { ok: true, prompt: parts.join("\n\n").trim() };
}

function parseMcPromptAndChoices(lines: string[]): { ok: true; prompt: string; choices: string[] } | { ok: false; error: string } {
  const choiceA = /^\s*\(([A-E])\)\s*(.*)$/;
  const choiceB = /^\s*([A-E])[\)\.]\s*(.*)$/;

  const promptLines: string[] = [];
  const byLetter = new Map<string, string[]>();
  let currentLetter: string | null = null;
  let sawChoices = false;

  for (const rawLine of lines) {
    const line = rawLine.replace(/[ \t]+$/g, "");
    const m1 = line.match(choiceA);
    const m2 = m1 ? null : line.match(choiceB);
    const letter = (m1?.[1] ?? m2?.[1] ?? "").trim();
    const text = (m1?.[2] ?? m2?.[2] ?? "").trim();

    if (letter && /^[A-E]$/.test(letter)) {
      sawChoices = true;
      currentLetter = letter;
      if (!byLetter.has(letter)) byLetter.set(letter, []);
      if (text) byLetter.get(letter)!.push(text);
      continue;
    }

    if (!sawChoices) {
      promptLines.push(line);
      continue;
    }

    if (currentLetter) {
      // continuation line
      if (line.trim().length === 0) {
        byLetter.get(currentLetter)!.push("");
      } else {
        byLetter.get(currentLetter)!.push(line.trim());
      }
    }
  }

  if (!sawChoices) return { ok: false, error: "No A–E choices found." };

  const letters = ["A", "B", "C", "D", "E"].filter((l) => byLetter.has(l));
  if (!(letters.length === 4 || letters.length === 5)) {
    return { ok: false, error: "Expected 4 or 5 labeled choices." };
  }

  const choices = letters.map((l) => trimAndCollapseBlankLines((byLetter.get(l) ?? []).join("\n")));
  if (choices.some((c) => !c)) return { ok: false, error: "A choice is empty." };

  const prompt = trimAndCollapseBlankLines(promptLines.join("\n"));
  if (!prompt) return { ok: false, error: "Missing prompt before choices." };

  return { ok: true, prompt, choices };
}

function parseLeadingNumberToken(token: string): { ok: true; value: number; decimals: number; prefix: string; unit: string; useCommas: boolean } | { ok: false } {
  const m = token.trim().match(/^([$€£]?)(-?\d[\d,]*(?:\.\d+)?)(.*)$/);
  if (!m) return { ok: false };
  const prefix = (m[1] ?? "").trim();
  const numRaw = (m[2] ?? "").trim();
  const unit = (m[3] ?? "").trim();

  const value = Number.parseFloat(numRaw.replace(/,/g, ""));
  if (!Number.isFinite(value)) return { ok: false };

  const decimals = (numRaw.split(".")[1] ?? "").length;
  const useCommas = /,/.test(numRaw);
  return { ok: true, value, decimals, prefix, unit, useCommas };
}

function formatNumber(value: number, decimals: number, useCommas: boolean): string {
  const fixed = decimals > 0 ? value.toFixed(decimals) : String(Math.round(value));
  if (!useCommas) return fixed;
  const [intPart, fracPart] = fixed.split(".");
  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return fracPart ? `${withCommas}.${fracPart}` : withCommas;
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildNumericChoicesFromAnswerToken(answerToken: string): { ok: true; choices: string[]; correctIndex: number } | { ok: false; error: string } {
  const parsed = parseLeadingNumberToken(answerToken);
  if (!parsed.ok) return { ok: false, error: "Could not parse numeric answer." };

  const abs = Math.abs(parsed.value);
  let step = 1;
  if (parsed.decimals > 0) {
    step = parsed.decimals === 1 ? 0.5 : 0.1;
  } else if (abs <= 10) step = 1;
  else if (abs <= 50) step = 2;
  else if (abs <= 200) step = 5;
  else if (abs <= 1000) step = 10;
  else if (abs <= 10_000) step = 100;
  else step = Math.max(100, Math.round(abs * 0.05));

  const values = [parsed.value - 2 * step, parsed.value - step, parsed.value, parsed.value + step, parsed.value + 2 * step];
  const uniq = Array.from(new Set(values.map((v) => Number(formatNumber(v, parsed.decimals, false)))));
  if (uniq.length < 5) {
    // fallback: add more spread if rounding created duplicates
    const bump = step * 3;
    for (const extra of [parsed.value - bump, parsed.value + bump, parsed.value + 4 * step, parsed.value - 4 * step]) {
      const n = Number(formatNumber(extra, parsed.decimals, false));
      if (!uniq.includes(n)) uniq.push(n);
      if (uniq.length >= 5) break;
    }
  }
  if (uniq.length < 5) return { ok: false, error: "Could not generate numeric choices." };

  const candidateChoices = uniq.slice(0, 5).map((v) => {
    const formatted = formatNumber(v, parsed.decimals, parsed.useCommas);
    const unitSuffix = parsed.unit ? ` ${parsed.unit}` : "";
    return `${parsed.prefix}${formatted}${unitSuffix}`.trim();
  });

  const shuffled = shuffle(candidateChoices);
  const correctLabel = `${parsed.prefix}${formatNumber(parsed.value, parsed.decimals, parsed.useCommas)}${parsed.unit ? ` ${parsed.unit}` : ""}`.trim();
  const correctIndex = shuffled.findIndex((c) => c === correctLabel);
  if (correctIndex < 0) {
    // If formatting differs (rare), just force correct into the array.
    shuffled[0] = correctLabel;
    return { ok: true, choices: shuffled, correctIndex: 0 };
  }

  return { ok: true, choices: shuffled, correctIndex };
}

export function parsePracticeImportText(input: string): PracticeImportResult {
  const raw = normalizeNewlines(input).trim();
  if (!raw) return { ok: false, error: "Paste text first." };

  const { questionText, answerText } = splitQuestionAndAnswerSections(raw);
  if (!questionText) return { ok: false, error: "Could not find any numbered questions." };

  const answerKey = parseAnswerKey(answerText);
  const questionBlocks = parseNumberedBlocks(questionText.split("\n"));

  if (questionBlocks.length === 0) return { ok: false, error: "Could not find any numbered questions (e.g. “1.”)." };

  const items: PracticeImportItem[] = [];
  const skipped: PracticeImportSkip[] = [];

  for (const qb of questionBlocks) {
    const bodyLines = qb.lines;
    const bodyText = trimAndCollapseBlankLines(bodyLines.join("\n"));
    if (!bodyText) {
      skipped.push({ number: qb.number, reason: "Empty question block." });
      continue;
    }

    const keyEntry = answerKey.get(qb.number);
    if (!keyEntry) {
      skipped.push({ number: qb.number, reason: "Missing answer/explanation in the Answers section." });
      continue;
    }

    // Skip select-all-that-apply questions for now
    if (/indicate all|select all/i.test(bodyText) || keyEntry.kind === "multi") {
      skipped.push({ number: qb.number, reason: "Select-all-that-apply questions aren’t supported yet." });
      continue;
    }

    if (isQcBlock(bodyLines)) {
      const parsedQc = parseQcPrompt(bodyLines);
      if (!parsedQc.ok) {
        skipped.push({ number: qb.number, reason: parsedQc.error });
        continue;
      }
      if (keyEntry.kind !== "letter") {
        skipped.push({ number: qb.number, reason: "QC needs a letter answer (A–D)." });
        continue;
      }
      const correctIndex = keyEntry.correctLetter.charCodeAt(0) - 65;
      if (correctIndex < 0 || correctIndex > 3) {
        skipped.push({ number: qb.number, reason: "QC answer must be A–D." });
        continue;
      }
      items.push({
        number: qb.number,
        prompt: parsedQc.prompt,
        choices: [...QC_CHOICES],
        correctIndex,
        explanation: keyEntry.explanation,
      });
      continue;
    }

    const parsedMc = parseMcPromptAndChoices(bodyLines);
    if (parsedMc.ok) {
      if (keyEntry.kind !== "letter") {
        skipped.push({ number: qb.number, reason: "Multiple-choice needs a letter answer (A–E)." });
        continue;
      }
      const correctIndex = keyEntry.correctLetter.charCodeAt(0) - 65;
      const maxIndex = parsedMc.choices.length - 1;
      if (correctIndex < 0 || correctIndex > maxIndex) {
        skipped.push({ number: qb.number, reason: `Answer letter must be A–${String.fromCharCode(65 + maxIndex)}.` });
        continue;
      }

      items.push({
        number: qb.number,
        prompt: parsedMc.prompt,
        choices: parsedMc.choices,
        correctIndex,
        explanation: keyEntry.explanation,
      });
      continue;
    }

    // Fallback: treat as numeric-entry question and convert into 5-choice MC.
    if (keyEntry.kind === "numeric") {
      const numericChoices = buildNumericChoicesFromAnswerToken(keyEntry.answerToken);
      if (!numericChoices.ok) {
        skipped.push({ number: qb.number, reason: numericChoices.error });
        continue;
      }
      items.push({
        number: qb.number,
        prompt: bodyText,
        choices: numericChoices.choices,
        correctIndex: numericChoices.correctIndex,
        explanation: keyEntry.explanation,
      });
      continue;
    }

    skipped.push({ number: qb.number, reason: "Unsupported question format." });
  }

  return { ok: true, items, skipped };
}

