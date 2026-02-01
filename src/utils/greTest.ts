import type { WordEntity } from "../store/types";
import { CUSTOM_QUESTIONS_BY_WORD_ID } from "../data/customQuestions";

export type GreChoiceQuestion = {
  id: string;
  wordId: string;
  stem: string;
  choices: string[]; // 5 items
  correctIndex: number;
  explanation: string;
  difficulty: "hard";
};

export type GreTestSession = {
  id: string;
  groupId: number;
  groupName: string;
  startedAtISO: string;
  questions: GreChoiceQuestion[];
  currentIndex: number;
  // Once submitted, answers are locked and correctness/explanations can be revealed.
  isSubmitted: boolean;
  submittedAtISO?: string;
  // selected choice index per question id
  answersByQuestionId: Record<string, number>;
  // mark a question to revisit (GRE-style "Mark" feature)
  markedByQuestionId: Record<string, boolean>;
  // whether the explanation panel is expanded per question id
  isExplanationVisibleByQuestionId: Record<string, boolean>;
};

const CHOICE_LABELS = ["A", "B", "C", "D", "E"];

const STOPWORDS = new Set(
  [
    "the",
    "a",
    "an",
    "and",
    "or",
    "but",
    "to",
    "of",
    "in",
    "on",
    "at",
    "for",
    "with",
    "as",
    "by",
    "from",
    "that",
    "this",
    "it",
    "was",
    "were",
    "is",
    "are",
    "be",
    "been",
    "being",
    "only",
    "most",
    "more",
    "less",
    "very",
    "every",
    "any",
  ].map((w) => w.toLowerCase())
);

// A small pool of GRE-ish distractors. We blend these with your own word list.
// (No copyrighted ETS items; just a generic vocabulary pool.)
const HARD_DISTRACTOR_POOL = [
  "diffidence",
  "humility",
  "cynicism",
  "garrulity",
  "obsequiousness",
  "equivocation",
  "magnanimity",
  "acerbic",
  "insipid",
  "didactic",
  "capricious",
  "quixotic",
  "recalcitrant",
  "sanguine",
  "morose",
  "fastidious",
  "laconic",
  "loquacious",
  "munificent",
  "parsimonious",
  "sophistry",
  "perfidy",
  "intransigent",
  "obdurate",
  "ubiquitous",
  "perfunctory",
  "pedantic",
  "placate",
  "incisive",
  "banal",
  "trenchant",
  "cogent",
  "arduous",
  "austere",
  "venerable",
  "implacable",
  "pernicious",
  "ameliorate",
  "enervate",
  "assuage",
  "eschew",
  "obviate",
  "anomalous",
  "equanimity",
  "prodigal",
  "frugal",
  "mitigate",
  "inchoate",
  "vociferous",
  "reticent",
  "diffuse",
  "esoteric",
  "iconoclastic",
  "ostentatious",
  "aesthetic",
  "pragmatic",
  "antipathy",
  "cathartic",
  "prosaic",
  "misanthropic",
  "altruistic",
  "ephemeral",
  "tenacious",
  "epitome",
  "paragon",
  "reverence",
  "condescension",
  "dispassionate",
  "impartial",
  "disingenuous",
  "candor",
  "prevarication",
  "inexorable",
  "immutable",
  "capitulate",
  "deleterious",
  "ambivalent",
  "antithetical",
  "circuitous",
  "conflagration",
  "delineate",
  "deride",
  "dormant",
  "erudite",
  "fervent",
  "gregarious",
  "hackneyed",
  "idiosyncratic",
  "jovial",
  "kowtow",
  "lament",
  "meticulous",
  "nebulous",
  "opaque",
  "parochial",
  "quandary",
  "relegate",
  "sporadic",
  "taciturn",
  "unyielding",
  "vindicate",
  "wary",
  "zealous",
];

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function normalizeToken(token: string): string {
  return token
    .toLowerCase()
    .replace(/[^a-z\-']/g, "")
    .trim();
}

function extractClueTokens(sentence: string, maxTokens: number): string[] {
  const tokens = sentence
    .split(/\s+/)
    .map(normalizeToken)
    .filter((t) => t.length >= 4)
    .filter((t) => !STOPWORDS.has(t));

  const unique: string[] = [];
  const seen = new Set<string>();
  for (const t of tokens) {
    if (seen.has(t)) continue;
    seen.add(t);
    unique.push(t);
    if (unique.length >= maxTokens) break;
  }
  return unique;
}

function blankOutWord(sentence: string, word: string): string {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`\\b${escaped}\\b`, "i");
  if (regex.test(sentence)) return sentence.replace(regex, "______________");
  // fallback: just append a blank if the sentence does not contain the word literally
  return `${sentence.replace(/\s+$/, "")} _____________`;
}

type WordShape = "noun" | "adjective" | "verb" | "other";

function inferWordShape(word: string): WordShape {
  const w = word.toLowerCase();
  if (/(ness|tion|sion|ment|ity|ism|ence|ance|hood|ship)$/.test(w)) return "noun";
  if (/(ous|ful|less|ive|ic|ical|ary|ate|ant|ent|al)$/.test(w)) return "adjective";
  if (/(ate|ify|ise|ize|en)$/.test(w)) return "verb";
  return "other";
}

function pickHardDistractors(params: {
  correctWord: string;
  pool: string[];
  count: number;
}): string[] {
  const targetShape = inferWordShape(params.correctWord);

  const candidates = params.pool
    .filter((w) => w.toLowerCase() !== params.correctWord.toLowerCase())
    .filter((w) => w.length >= 4)
    .filter((w) => {
      const shape = inferWordShape(w);
      // Prefer same shape; allow "other" to avoid empty pool.
      if (targetShape === "other") return true;
      return shape === targetShape || shape === "other";
    });

  const shuffled = shuffle(candidates);
  const picked: string[] = [];
  const seen = new Set<string>();
  for (const w of shuffled) {
    const key = w.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    picked.push(w);
    if (picked.length >= params.count) break;
  }
  return picked;
}

export function generateHardQuestion(params: {
  word: WordEntity;
  distractorPool: string[];
}): GreChoiceQuestion {
  const override = CUSTOM_QUESTIONS_BY_WORD_ID[params.word.id];
  if (override && override.choices.length === 5) {
    return {
      id: makeId(`q-${params.word.id}`),
      wordId: params.word.id,
      difficulty: "hard",
      ...override,
    };
  }

  const stemSentence = blankOutWord(params.word.sentence, params.word.word);

  // GRE-style: single blank + instruction line.
  const stem = `${stemSentence}\n\nSelect the answer.`;

  const combinedPool = Array.from(
    new Set([...params.distractorPool, ...HARD_DISTRACTOR_POOL])
  );

  const distractors = pickHardDistractors({
    correctWord: params.word.word,
    pool: combinedPool,
    count: 4,
  });

  // Guarantee 5 choices.
  const choices = shuffle([params.word.word, ...distractors]).slice(0, 5);
  const correctIndex = choices.findIndex(
    (c) => c.toLowerCase() === params.word.word.toLowerCase()
  );

  const clueTokens = extractClueTokens(params.word.sentence, 4);
  const answerLabel = CHOICE_LABELS[correctIndex] ?? "";

  const explanationParts: string[] = [];
  explanationParts.push(`Answer: ${answerLabel}) ${choices[correctIndex]}`);
  explanationParts.push("Explanation:");

  if (clueTokens.length >= 2) {
    explanationParts.push(
      `The keywords are “${clueTokens[0]}” and “${clueTokens[1]}”. These signal the sentence’s tone/meaning.`
    );
  } else {
    explanationParts.push("The keywords are the strongest context clues around the blank.");
  }

  if (params.word.synonym) {
    explanationParts.push(
      `Therefore, the blank should be filled by a word meaning closest to “${params.word.synonym}”.`
    );
  } else {
    explanationParts.push("Therefore, pick the option that best preserves the sentence meaning.");
  }

  explanationParts.push(
    `(${answerLabel}) “${choices[correctIndex]}” fits the context. The remaining options do not match the intended meaning or tone.`
  );

  return {
    id: makeId(`q-${params.word.id}`),
    wordId: params.word.id,
    stem,
    choices,
    correctIndex,
    explanation: explanationParts.join("\n\n"),
    difficulty: "hard",
  };
}

export function generateTestForSet(params: {
  groupId: number;
  groupName: string;
  words: WordEntity[];
  questionCount: number;
  globalPoolWords: string[];
  startedAtISO: string;
}): GreTestSession {
  const shuffled = shuffle(params.words);
  const selected = shuffled.slice(0, Math.min(params.questionCount, params.words.length));

  const questions = selected.map((w) =>
    generateHardQuestion({ word: w, distractorPool: params.globalPoolWords })
  );

  return {
    id: makeId("test"),
    groupId: params.groupId,
    groupName: params.groupName,
    startedAtISO: params.startedAtISO,
    questions,
    currentIndex: 0,
    isSubmitted: false,
    submittedAtISO: undefined,
    answersByQuestionId: {},
    markedByQuestionId: {},
    isExplanationVisibleByQuestionId: {},
  };
}

export function computeTestScore(session: GreTestSession): {
  correct: number;
  total: number;
} {
  let correct = 0;
  for (const q of session.questions) {
    const chosen = session.answersByQuestionId[q.id];
    if (typeof chosen === "number" && chosen === q.correctIndex) correct += 1;
  }
  return { correct, total: session.questions.length };
}

// GRE Verbal/Quant are reported on a 130–170 scale. Real scoring is not linear (equating),
// so this is a simple estimate for UX purposes.
export function estimateGre170Score(params: { correct: number; total: number }): number {
  const total = Math.max(0, params.total);
  const correct = Math.max(0, Math.min(params.correct, total));
  if (total === 0) return 130;
  const ratio = correct / total;
  const estimated = 130 + Math.round(40 * ratio);
  return Math.max(130, Math.min(170, estimated));
}

export function getWrongQuestions(session: GreTestSession): GreChoiceQuestion[] {
  return session.questions.filter((q) => {
    const chosen = session.answersByQuestionId[q.id];
    return typeof chosen === "number" && chosen !== q.correctIndex;
  });
}
