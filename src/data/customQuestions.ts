import type { GreChoiceQuestion } from "../utils/greTest";

// Optional: hand-crafted, GRE-style questions.
// Keyed by app wordId (format: "<groupId>-<seedWordId>").
// If a word has an entry here, the app will use it instead of the auto-generated version.

type CustomQuestion = Pick<GreChoiceQuestion, "stem" | "choices" | "correctIndex" | "explanation">;

export const CUSTOM_QUESTIONS_BY_WORD_ID: Record<string, CustomQuestion> = {
  "1-1": {
    stem:
      "The marsh seemed to __________ with insects; even a brief walk left my clothes speckled with gnats.\n\nSelect the answer.",
    choices: ["abound", "languish", "diminish", "delineate", "placate"],
    correctIndex: 0,
    explanation:
      "Answer: A) abound\n\nExplanation:\nThe sentence implies an overwhelming quantity of insects (\"speckled with gnats\"). \"Abound\" means to exist in great numbers or be plentiful. The other options describe weakening (languish/diminish), defining (delineate), or calming (placate), none of which fit abundance.",
  },
  "1-2": {
    stem:
      "The committee produced an __________ plan: it gestured toward reform but offered no concrete steps or clear definition.\n\nSelect the answer.",
    choices: ["amorphous", "sagacious", "perfunctory", "garrulous", "incisive"],
    correctIndex: 0,
    explanation:
      "Answer: A) amorphous\n\nExplanation:\nThe clue is \"no concrete steps\" and \"no clear definition\". \"Amorphous\" means lacking a clear structure or form. The other choices suggest wisdom (sagacious), routine/half-hearted work (perfunctory), talkativeness (garrulous), or sharp analysis (incisive).",
  },
  "1-3": {
    stem:
      "Although the retreat promised comfort, its rules were surprisingly __________: no music, no desserts, and long hours of silent reflection.\n\nSelect the answer.",
    choices: ["austere", "opulent", "capricious", "improvised", "flippant"],
    correctIndex: 0,
    explanation:
      "Answer: A) austere\n\nExplanation:\nThe details (\"no music, no desserts\") point to a strict, plain, self-denying environment. \"Austere\" means severely simple or strict. \"Opulent\" is the opposite, and the remaining options don't match the sense of severity.",
  },
  "1-5": {
    stem:
      "Her steady smile seemed to __________ her irritation; only the tightness in her voice hinted at how angry she was.\n\nSelect the answer.",
    choices: ["belie", "proclaim", "magnify", "vindicate", "catalog"],
    correctIndex: 0,
    explanation:
      "Answer: A) belie\n\nExplanation:\n\"Belie\" means to contradict or mask. The smile made it appear she wasn't irritated, while the voice suggested the opposite. \"Proclaim\" and \"magnify\" would reveal or intensify irritation, not conceal it.",
  },
};
