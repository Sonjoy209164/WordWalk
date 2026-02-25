import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { toISODate, isYesterday } from "../utils/date";
import { applySm2, makeNewSrsState, ReviewRating } from "../utils/sm2";
import { coinRewardForRating, xpRewardForRating } from "../utils/rewards";
import { generateTestForSet, type GreTestSession } from "../utils/greTest";
import type { DailyActivity, GroupEntity, PracticeQuestion, SeedData, TodoEntity, WordEntity } from "./types";

type ThemeMode = "system" | "light" | "dark";
type SpeechLanguage = "system" | "en-US" | "en-GB";

type PracticeSession = {
  id: string;
  chapterId: string;
  chapterTitle: string;
  startedAtISO: string;
  durationSec: number;
  endsAtMs: number;
  questions: PracticeQuestion[];
  currentIndex: number;
  isSubmitted: boolean;
  submittedAtISO?: string;
  answersByQuestionId: Record<string, number>;
  markedByQuestionId: Record<string, boolean>;
  isExplanationVisibleByQuestionId: Record<string, boolean>;
};

export interface AppState {
  hasHydrated: boolean;
  isBootstrapped: boolean;

  groups: GroupEntity[];
  wordsById: Record<string, WordEntity>;
  todos: TodoEntity[];
  practiceQuestionsByChapterId: Record<string, PracticeQuestion[]>;

  activityByDateISO: Record<string, DailyActivity>;

  streak: {
    currentStreak: number;
    bestStreak: number;
    lastGoalHitISO?: string;
  };

  wallet: {
    coins: number;
    xp: number;
    totalReviewed: number;
  };

  settings: {
    dailyGoal: number;
    themeMode: ThemeMode;
    speech: {
      language: SpeechLanguage;
      voiceId?: string;
      rate: number;
      pitch: number;
    };
  };

  // ---- Timed practice (chapters)
  activePracticeSession?: PracticeSession;

  // ---- Test mode (GRE-style)
  activeTestSession?: GreTestSession;

  setHasHydrated: (hasHydrated: boolean) => void;

  bootstrapFromSeed: (seed: SeedData) => void;
  bootstrapPracticeQuestionsFromSeed: (seed: any) => void;
  recordReview: (wordId: string, rating: ReviewRating, todayISO?: string) => void;
  toggleStar: (wordId: string) => void;

  createGroup: (
    name: string,
    preferredGroupId?: number
  ) => { ok: true; groupId: number } | { ok: false; error: string };
  addWordToGroup: (params: {
    groupId: number;
    word: string;
    synonym: string;
    sentence: string;
    todayISO?: string;
  }) => { ok: true; wordId: string } | { ok: false; error: string };

  addTodo: (title: string, dueDateISO?: string) => void;
  toggleTodoCompletion: (todoId: string) => void;
  deleteTodo: (todoId: string) => void;

  addPracticeQuestion: (params: {
    chapterId: string;
    prompt: string;
    choices: string[];
    correctIndex: number;
    explanation: string;
    todayISO?: string;
  }) => { ok: true; questionId: string } | { ok: false; error: string };
  deletePracticeQuestion: (params: { chapterId: string; questionId: string }) => void;

  setDailyGoal: (dailyGoal: number) => void;
  setThemeMode: (themeMode: ThemeMode) => void;
  setSpeechLanguage: (language: SpeechLanguage) => void;
  setSpeechVoiceId: (voiceId?: string) => void;
  setSpeechRate: (rate: number) => void;
  setSpeechPitch: (pitch: number) => void;

  // Timed practice actions
  startTimedPracticeForChapter: (params: {
    chapterId: string;
    chapterTitle: string;
    questionCount: number;
    durationSec: number;
    todayISO?: string;
  }) => void;
  answerCurrentPracticeQuestion: (choiceIndex: number) => void;
  clearCurrentPracticeAnswer: () => void;
  goToNextPracticeQuestion: () => void;
  goToPrevPracticeQuestion: () => void;
  goToPracticeQuestion: (index: number) => void;
  toggleMarkCurrentPracticeQuestion: () => void;
  submitActivePractice: (todayISO?: string) => void;
  togglePracticeExplanation: () => void;
  clearPracticeSession: () => void;

  // Test actions
  startHardTestForGroup: (groupId: number, questionCount: number, todayISO?: string) => void;
  answerCurrentTestQuestion: (choiceIndex: number) => void;
  clearCurrentTestAnswer: () => void;
  goToNextTestQuestion: () => void;
  goToPrevTestQuestion: () => void;
  goToTestQuestion: (index: number) => void;
  toggleMarkCurrentTestQuestion: () => void;
  submitActiveTest: (todayISO?: string) => void;
  toggleCurrentExplanation: () => void;
  clearTestSession: () => void;

  resetAll: () => void;

  // selectors / helpers
  getTodayActivity: (todayISO?: string) => DailyActivity;
  getDueWordIds: (todayISO?: string) => string[];
  getNewWordIds: () => string[];
}

type PersistedAppState = Pick<
  AppState,
  | "isBootstrapped"
  | "groups"
  | "wordsById"
  | "todos"
  | "practiceQuestionsByChapterId"
  | "activityByDateISO"
  | "streak"
  | "wallet"
  | "settings"
>;

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeGoal(goal: number): number {
  if (!Number.isFinite(goal)) return 20;
  return Math.max(5, Math.min(80, Math.round(goal)));
}

function normalizeWordKey(word: string): string {
  return word.trim().toLowerCase();
}

function pickFirstMissingPositiveInt(used: Set<number>): number {
  for (let i = 1; i < Number.MAX_SAFE_INTEGER; i++) {
    if (!used.has(i)) return i;
  }
  return Date.now();
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function scoreForDedupe(word: WordEntity): number {
  const times = word.stats?.timesReviewed ?? 0;
  const hasSentence = Boolean(word.sentence?.trim());
  const hasSynonym = Boolean(word.synonym?.trim());
  const starred = word.isStarred ? 1 : 0;
  const groupBonus = Math.max(0, 200 - word.groupId); // prefer earlier sets when ties
  return times * 1_000_000 + (hasSentence ? 1_000 : 0) + (hasSynonym ? 200 : 0) + starred * 50 + groupBonus;
}

function dedupeWordsState(state: Pick<AppState, "groups" | "wordsById">): {
  didChange: boolean;
  groups: GroupEntity[];
  wordsById: Record<string, WordEntity>;
} {
  const bestByKey = new Map<string, WordEntity>();
  const droppedIds = new Set<string>();

  for (const w of Object.values(state.wordsById)) {
    const key = normalizeWordKey(w.word);
    if (!key) continue;

    const prev = bestByKey.get(key);
    if (!prev) {
      bestByKey.set(key, w);
      continue;
    }

    const prevScore = scoreForDedupe(prev);
    const nextScore = scoreForDedupe(w);

    if (nextScore > prevScore) {
      bestByKey.set(key, w);
      droppedIds.add(prev.id);
      droppedIds.delete(w.id);
    } else {
      droppedIds.add(w.id);
    }
  }

  if (droppedIds.size === 0) {
    // Still normalize group wordIds (in case any stale ids exist).
    const knownIds = new Set(Object.keys(state.wordsById));
    const normalizedGroups = state.groups.map((g) => ({
      ...g,
      wordIds: g.wordIds.filter((id) => knownIds.has(id)),
    }));
    return { didChange: false, groups: normalizedGroups, wordsById: state.wordsById };
  }

  const nextWordsById: Record<string, WordEntity> = {};
  for (const w of bestByKey.values()) {
    nextWordsById[w.id] = w;
  }

  const keptIds = new Set(Object.keys(nextWordsById));
  const nextGroups = state.groups.map((g) => ({
    ...g,
    wordIds: g.wordIds.filter((id) => keptIds.has(id)),
  }));

  return { didChange: true, groups: nextGroups, wordsById: nextWordsById };
}

// ---- Derived snapshot caches (prevents React 18 + Zustand getSnapshot loops)
const DEFAULT_DAILY_ACTIVITY: DailyActivity = { reviewedCount: 0, didHitGoal: false };

let cachedTodayISO: string | null = null;
let cachedActivityMapRef: Record<string, DailyActivity> | null = null;
let cachedTodayActivityRef: DailyActivity = DEFAULT_DAILY_ACTIVITY;

let cachedDueISO: string | null = null;
let cachedWordsRefForDue: AppState["wordsById"] | null = null;
let cachedDueIdsRef: string[] = [];

let cachedWordsRefForNew: AppState["wordsById"] | null = null;
let cachedNewIdsRef: string[] = [];

export const useAppStore = create<AppState>()(
  persist<AppState, [], [], PersistedAppState>(
    (set, get) => ({
      hasHydrated: false,
      isBootstrapped: false,

      groups: [],
      wordsById: {},
      todos: [],
      practiceQuestionsByChapterId: {},

      activityByDateISO: {},

      streak: {
        currentStreak: 0,
        bestStreak: 0,
        lastGoalHitISO: undefined,
      },

      wallet: {
        coins: 0,
        xp: 0,
        totalReviewed: 0,
      },

      settings: {
        dailyGoal: 20,
        themeMode: "system",
        speech: {
          language: "system",
          voiceId: undefined,
          rate: 0.95,
          pitch: 1.0,
        },
      },

      activeTestSession: undefined,
      activePracticeSession: undefined,

      setHasHydrated: (hasHydrated) => set({ hasHydrated }),

      bootstrapFromSeed: (seed) => {
        const existingWordCount = Object.keys(get().wordsById).length;
        if (existingWordCount > 0) {
          let state = get();

          // Maintenance: clean duplicates & stale references in persisted state.
          const deduped = dedupeWordsState({ groups: state.groups, wordsById: state.wordsById });
          if (deduped.didChange) {
            set({ groups: deduped.groups, wordsById: deduped.wordsById });
            state = { ...state, groups: deduped.groups, wordsById: deduped.wordsById };
          }

          const todayISO = toISODate(new Date());
          const nextGroups: GroupEntity[] = [...state.groups];
          const nextWordsById: Record<string, WordEntity> = { ...state.wordsById };
          const seenGlobal = new Set(Object.values(nextWordsById).map((w) => normalizeWordKey(w.word)));

          let didChange = false;

          const groupIndexById = new Map<number, number>();
          for (let i = 0; i < nextGroups.length; i++) {
            groupIndexById.set(nextGroups[i].id, i);
          }

          for (const seedGroup of seed.groups) {
            const existingGroupIndex = groupIndexById.get(seedGroup.id);

            if (typeof existingGroupIndex !== "number") {
              nextGroups.push({
                id: seedGroup.id,
                name: seedGroup.name,
                wordIds: [],
              });
              groupIndexById.set(seedGroup.id, nextGroups.length - 1);
              didChange = true;
            } else {
              const existingGroup = nextGroups[existingGroupIndex];
              if (existingGroup.name !== seedGroup.name) {
                nextGroups[existingGroupIndex] = { ...existingGroup, name: seedGroup.name };
                didChange = true;
              }
            }

            const groupIndex = groupIndexById.get(seedGroup.id)!;
            const group = nextGroups[groupIndex];
            const wordIdSet = new Set(group.wordIds);

            for (const seedWord of seedGroup.words) {
              const key = normalizeWordKey(seedWord.word);
              if (!key) continue;

              const appWordId = `${seedGroup.id}-${seedWord.id}`;
              const existingWord = nextWordsById[appWordId];

              if (existingWord) {
                const nextWord = seedWord.word;
                const nextSynonym = seedWord.synonym;
                const nextSentence = seedWord.sentence;

                if (
                  existingWord.groupId !== seedGroup.id ||
                  existingWord.groupName !== seedGroup.name ||
                  existingWord.word !== nextWord ||
                  existingWord.synonym !== nextSynonym ||
                  existingWord.sentence !== nextSentence
                ) {
                  nextWordsById[appWordId] = {
                    ...existingWord,
                    groupId: seedGroup.id,
                    groupName: seedGroup.name,
                    word: nextWord,
                    synonym: nextSynonym,
                    sentence: nextSentence,
                  };
                  didChange = true;
                }

                if (!wordIdSet.has(appWordId)) {
                  wordIdSet.add(appWordId);
                  didChange = true;
                }
                continue;
              }

              if (seenGlobal.has(key)) continue;
              seenGlobal.add(key);

              nextWordsById[appWordId] = {
                id: appWordId,
                groupId: seedGroup.id,
                groupName: seedGroup.name,
                word: seedWord.word,
                synonym: seedWord.synonym,
                sentence: seedWord.sentence,
                isStarred: false,
                srs: makeNewSrsState(todayISO),
                stats: {
                  timesReviewed: 0,
                  lastReviewedAtISO: undefined,
                },
              };
              wordIdSet.add(appWordId);
              didChange = true;
            }

            if (wordIdSet.size !== group.wordIds.length) {
              nextGroups[groupIndex] = { ...group, wordIds: Array.from(wordIdSet) };
            }
          }

          nextGroups.sort((a, b) => a.id - b.id);

          if (didChange || !state.isBootstrapped) {
            set({
              isBootstrapped: true,
              groups: nextGroups,
              wordsById: nextWordsById,
            });
          }
          return;
        }

        const todayISO = toISODate(new Date());

        const groups: GroupEntity[] = [];
        const wordsById: Record<string, WordEntity> = {};
        const seenGlobal = new Set<string>();

        for (const group of seed.groups) {
          const wordIds: string[] = [];
          for (const seedWord of group.words) {
            const key = normalizeWordKey(seedWord.word);
            if (!key || seenGlobal.has(key)) continue;
            const appWordId = `${group.id}-${seedWord.id}`;
            wordIds.push(appWordId);
            seenGlobal.add(key);

            wordsById[appWordId] = {
              id: appWordId,
              groupId: group.id,
              groupName: group.name,
              word: seedWord.word,
              synonym: seedWord.synonym,
              sentence: seedWord.sentence,
              isStarred: false,
              srs: makeNewSrsState(todayISO),
              stats: {
                timesReviewed: 0,
                lastReviewedAtISO: undefined,
              },
            };
          }

          groups.push({
            id: group.id,
            name: group.name,
            wordIds,
          });
        }

        set({
          isBootstrapped: true,
          groups,
          wordsById,
        });
      },

      bootstrapPracticeQuestionsFromSeed: (seed) => {
        const chapters = Array.isArray(seed?.chapters) ? seed.chapters : [];
        if (chapters.length === 0) return;

        const state = get();
        const todayISO = toISODate(new Date());

        let didChange = false;
        const nextByChapterId: AppState["practiceQuestionsByChapterId"] = { ...state.practiceQuestionsByChapterId };

        for (const rawChapter of chapters) {
          const chapterId = String(rawChapter?.id ?? rawChapter?.chapterId ?? "").trim();
          if (!chapterId) continue;

          const seedQuestions = Array.isArray(rawChapter?.questions) ? rawChapter.questions : [];
          let existing = (nextByChapterId[chapterId] ?? []).slice();
          const indexById = new Map<string, number>(existing.map((q, idx) => [q.id, idx]));
          const sigSet = new Set(
            existing.map((q) => {
              const prompt = (q.prompt ?? "").trim();
              const choices = Array.isArray(q.choices)
                ? q.choices.map((c: string) => String(c ?? "").trim())
                : [];
              return `${prompt}\n--\n${choices.join("|")}`;
            })
          );

          const seedIdSet = new Set<string>();
          let chapterChanged = false;

          for (const rawQ of seedQuestions) {
            const seedId = String(rawQ?.id ?? "").trim();
            if (!seedId) continue;
            seedIdSet.add(seedId);

            const stableId = `pqseed-${chapterId}-${seedId}`;
            const prompt = String(rawQ?.prompt ?? "").trim();
            if (!prompt) continue;

            const choices = Array.isArray(rawQ?.choices)
              ? rawQ.choices.map((c: unknown) => String(c ?? "").trim())
              : [];
            if (!(choices.length === 4 || choices.length === 5)) continue;
            if (choices.some((c: string) => !c)) continue;

            const correctIndex = Number.isFinite(rawQ?.correctIndex) ? Math.floor(rawQ.correctIndex) : -1;
            if (correctIndex < 0 || correctIndex > choices.length - 1) continue;

            const explanation = String(rawQ?.explanation ?? "").trim();

            const existingIdx = indexById.get(stableId);
            if (typeof existingIdx === "number") {
              const prev = existing[existingIdx];
              const same =
                prev.chapterId === chapterId &&
                prev.prompt === prompt &&
                prev.correctIndex === correctIndex &&
                (prev.explanation ?? "") === explanation &&
                Array.isArray(prev.choices) &&
                prev.choices.length === choices.length &&
                prev.choices.every((c, i) => c === choices[i]);

              if (!same) {
                existing[existingIdx] = {
                  ...prev,
                  chapterId,
                  prompt,
                  choices,
                  correctIndex,
                  explanation,
                  updatedAtISO: todayISO,
                };
                chapterChanged = true;
              }
              continue;
            }

            const sig = `${prompt}\n--\n${choices.join("|")}`;
            if (sigSet.has(sig)) continue;
            sigSet.add(sig);

            const q: PracticeQuestion = {
              id: stableId,
              chapterId,
              prompt,
              choices,
              correctIndex,
              explanation,
              createdAtISO: todayISO,
              updatedAtISO: todayISO,
            };
            existing.push(q);
            indexById.set(stableId, existing.length - 1);
            chapterChanged = true;
          }

          const seedPrefix = `pqseed-${chapterId}-`;
          const filtered = existing.filter((q) => {
            if (!q.id.startsWith(seedPrefix)) return true;
            const rawSeedId = q.id.slice(seedPrefix.length);
            return seedIdSet.has(rawSeedId);
          });

          if (filtered.length !== existing.length) {
            existing = filtered;
            chapterChanged = true;
          }

          if (chapterChanged) {
            nextByChapterId[chapterId] = existing;
            didChange = true;
          }
        }

        if (didChange) {
          set({ practiceQuestionsByChapterId: nextByChapterId });
        }
      },

      recordReview: (wordId, rating, todayISO = toISODate(new Date())) => {
        const state = get();
        const word = state.wordsById[wordId];
        if (!word) return;

        const nextSrs = applySm2(word.srs, rating, todayISO);
        const nextCoins = state.wallet.coins + coinRewardForRating(rating);
        const nextXp = state.wallet.xp + xpRewardForRating(rating);
        const nextTotalReviewed = state.wallet.totalReviewed + 1;

        const previousActivity = state.activityByDateISO[todayISO] ?? DEFAULT_DAILY_ACTIVITY;
        const nextReviewedCount = previousActivity.reviewedCount + 1;
        const didHitGoalNow =
          !previousActivity.didHitGoal && nextReviewedCount >= state.settings.dailyGoal;

        const nextActivity: DailyActivity = {
          reviewedCount: nextReviewedCount,
          didHitGoal: previousActivity.didHitGoal || didHitGoalNow,
        };

        let nextStreak = state.streak;

        if (didHitGoalNow) {
          const lastGoalHitISO = state.streak.lastGoalHitISO;

          if (!lastGoalHitISO) {
            nextStreak = {
              currentStreak: 1,
              bestStreak: Math.max(state.streak.bestStreak, 1),
              lastGoalHitISO: todayISO,
            };
          } else if (lastGoalHitISO === todayISO) {
            nextStreak = state.streak;
          } else if (isYesterday(lastGoalHitISO, todayISO)) {
            const nextCurrent = state.streak.currentStreak + 1;
            nextStreak = {
              currentStreak: nextCurrent,
              bestStreak: Math.max(state.streak.bestStreak, nextCurrent),
              lastGoalHitISO: todayISO,
            };
          } else {
            nextStreak = {
              currentStreak: 1,
              bestStreak: Math.max(state.streak.bestStreak, 1),
              lastGoalHitISO: todayISO,
            };
          }
        }

        set({
          wordsById: {
            ...state.wordsById,
            [wordId]: {
              ...word,
              srs: nextSrs,
              stats: {
                timesReviewed: word.stats.timesReviewed + 1,
                lastReviewedAtISO: todayISO,
              },
            },
          },
          wallet: {
            coins: nextCoins,
            xp: nextXp,
            totalReviewed: nextTotalReviewed,
          },
          activityByDateISO: {
            ...state.activityByDateISO,
            [todayISO]: nextActivity,
          },
          streak: nextStreak,
        });
      },

      toggleStar: (wordId) => {
        const state = get();
        const word = state.wordsById[wordId];
        if (!word) return;

        set({
          wordsById: {
            ...state.wordsById,
            [wordId]: {
              ...word,
              isStarred: !word.isStarred,
            },
          },
        });
      },

      createGroup: (name, preferredGroupId) => {
        const trimmedName = name.trim();
        if (!trimmedName) return { ok: false, error: "Set name is required." };

        const state = get();
        const usedIds = new Set(state.groups.map((g) => g.id));

        let groupId: number;
        if (typeof preferredGroupId === "number") {
          if (!Number.isFinite(preferredGroupId) || preferredGroupId <= 0) {
            return { ok: false, error: "Set number must be a positive number." };
          }
          if (usedIds.has(preferredGroupId)) {
            return { ok: false, error: `Set ${preferredGroupId} already exists.` };
          }
          groupId = Math.floor(preferredGroupId);
        } else {
          groupId = pickFirstMissingPositiveInt(usedIds);
        }

        const nextGroups = [...state.groups, { id: groupId, name: trimmedName, wordIds: [] }].sort(
          (a, b) => a.id - b.id
        );
        set({ groups: nextGroups });
        return { ok: true, groupId };
      },

      addWordToGroup: ({ groupId, word, synonym, sentence, todayISO = toISODate(new Date()) }) => {
        const trimmedWord = word.trim();
        const trimmedSynonym = synonym.trim();
        const trimmedSentence = sentence.trim();

        if (!trimmedWord) return { ok: false, error: "Word is required." };
        if (!trimmedSentence) return { ok: false, error: "Sentence is required (needed for tests)." };

        const state = get();
        const group = state.groups.find((g) => g.id === groupId);
        if (!group) return { ok: false, error: `Set ${groupId} not found.` };

        const newKey = normalizeWordKey(trimmedWord);
        const existing = Object.values(state.wordsById).find((w) => normalizeWordKey(w.word) === newKey);
        if (existing) {
          return {
            ok: false,
            error: `Duplicate word “${trimmedWord}” already exists in Set ${existing.groupId}.`,
          };
        }

        const wordId = `${groupId}-u-${Date.now()}-${Math.random().toString(16).slice(2)}`;

        const nextWord: WordEntity = {
          id: wordId,
          groupId,
          groupName: group.name,
          word: trimmedWord,
          synonym: trimmedSynonym,
          sentence: trimmedSentence,
          isStarred: false,
          srs: makeNewSrsState(todayISO),
          stats: { timesReviewed: 0, lastReviewedAtISO: undefined },
        };

        set({
          wordsById: { ...state.wordsById, [wordId]: nextWord },
          groups: state.groups.map((g) => (g.id === groupId ? { ...g, wordIds: [wordId, ...g.wordIds] } : g)),
        });

        return { ok: true, wordId };
      },

      addTodo: (title, dueDateISO = toISODate(new Date())) => {
        const trimmedTitle = title.trim();
        if (!trimmedTitle) return;

        const createdAtISO = toISODate(new Date());
        const todo: TodoEntity = {
          id: makeId("todo"),
          title: trimmedTitle,
          dueDateISO,
          isCompleted: false,
          createdAtISO,
        };

        set((state) => ({
          todos: [todo, ...state.todos],
        }));
      },

      toggleTodoCompletion: (todoId) => {
        set((state) => ({
          todos: state.todos.map((todo) =>
            todo.id === todoId ? { ...todo, isCompleted: !todo.isCompleted } : todo
          ),
        }));
      },

      deleteTodo: (todoId) => {
        set((state) => ({
          todos: state.todos.filter((todo) => todo.id !== todoId),
        }));
      },

      addPracticeQuestion: ({ chapterId, prompt, choices, correctIndex, explanation, todayISO = toISODate(new Date()) }) => {
        const safeChapterId = chapterId.trim();
        if (!safeChapterId) return { ok: false, error: "Chapter is required." };

        const safePrompt = prompt.trim();
        if (!safePrompt) return { ok: false, error: "Question text is required." };

        const safeChoices = Array.isArray(choices) ? choices.map((c) => String(c ?? "").trim()) : [];
        if (!(safeChoices.length === 4 || safeChoices.length === 5)) {
          return { ok: false, error: "Provide 4 (A–D) or 5 (A–E) answer choices." };
        }
        if (safeChoices.some((c) => !c)) return { ok: false, error: "Answer choices can’t be empty." };

        const safeCorrectIndex = Number.isFinite(correctIndex) ? Math.floor(correctIndex) : -1;
        const maxIndex = safeChoices.length - 1;
        if (safeCorrectIndex < 0 || safeCorrectIndex > maxIndex) {
          const maxLabel = String.fromCharCode(65 + maxIndex);
          return { ok: false, error: `Pick the correct answer (A–${maxLabel}).` };
        }

        const safeExplanation = (explanation ?? "").trim();

        const questionId = makeId("pq");
        const q: PracticeQuestion = {
          id: questionId,
          chapterId: safeChapterId,
          prompt: safePrompt,
          choices: safeChoices,
          correctIndex: safeCorrectIndex,
          explanation: safeExplanation,
          createdAtISO: todayISO,
          updatedAtISO: todayISO,
        };

        set((state) => {
          const existing = state.practiceQuestionsByChapterId[safeChapterId] ?? [];
          return {
            practiceQuestionsByChapterId: {
              ...state.practiceQuestionsByChapterId,
              [safeChapterId]: [q, ...existing],
            },
          };
        });

        return { ok: true, questionId };
      },

      deletePracticeQuestion: ({ chapterId, questionId }) => {
        const safeChapterId = chapterId.trim();
        if (!safeChapterId) return;
        if (!questionId) return;

        set((state) => {
          const existing = state.practiceQuestionsByChapterId[safeChapterId] ?? [];
          if (existing.length === 0) return {};
          const next = existing.filter((q) => q.id !== questionId);
          if (next.length === existing.length) return {};

          return {
            practiceQuestionsByChapterId: {
              ...state.practiceQuestionsByChapterId,
              [safeChapterId]: next,
            },
          };
        });
      },

      setDailyGoal: (dailyGoal) => {
        set((state) => ({
          settings: { ...state.settings, dailyGoal: normalizeGoal(dailyGoal) },
        }));
      },

      setThemeMode: (themeMode) => {
        set((state) => ({
          settings: { ...state.settings, themeMode },
        }));
      },

      setSpeechLanguage: (language) => {
        set((state) => ({
          settings: { ...state.settings, speech: { ...state.settings.speech, language } },
        }));
      },

      setSpeechVoiceId: (voiceId) => {
        set((state) => ({
          settings: { ...state.settings, speech: { ...state.settings.speech, voiceId } },
        }));
      },

      setSpeechRate: (rate) => {
        const safe = Number.isFinite(rate) ? Math.max(0.5, Math.min(1.2, rate)) : 0.95;
        set((state) => ({
          settings: { ...state.settings, speech: { ...state.settings.speech, rate: safe } },
        }));
      },

      setSpeechPitch: (pitch) => {
        const safe = Number.isFinite(pitch) ? Math.max(0.5, Math.min(1.5, pitch)) : 1.0;
        set((state) => ({
          settings: { ...state.settings, speech: { ...state.settings.speech, pitch: safe } },
        }));
      },

      startTimedPracticeForChapter: ({ chapterId, chapterTitle, questionCount, durationSec, todayISO = toISODate(new Date()) }) => {
        const state = get();
        const bank = state.practiceQuestionsByChapterId[chapterId] ?? [];
        if (bank.length === 0) {
          set({ activePracticeSession: undefined });
          return;
        }

        const safeQuestionCount = Math.max(1, Math.min(Math.floor(questionCount), bank.length));
        const safeDurationSec = Number.isFinite(durationSec)
          ? Math.max(60, Math.min(3 * 60 * 60, Math.floor(durationSec)))
          : 10 * 60;

        const picked = shuffle(bank).slice(0, safeQuestionCount);
        const nowMs = Date.now();

        const session: PracticeSession = {
          id: makeId("practice"),
          chapterId,
          chapterTitle: chapterTitle.trim() || "Timed Practice",
          startedAtISO: todayISO,
          durationSec: safeDurationSec,
          endsAtMs: nowMs + safeDurationSec * 1000,
          questions: picked,
          currentIndex: 0,
          isSubmitted: false,
          submittedAtISO: undefined,
          answersByQuestionId: {},
          markedByQuestionId: {},
          isExplanationVisibleByQuestionId: {},
        };

        set({ activePracticeSession: session });
      },

      answerCurrentPracticeQuestion: (choiceIndex) => {
        const session = get().activePracticeSession;
        if (!session) return;
        if (session.isSubmitted) return;

        const q = session.questions[session.currentIndex];
        if (!q) return;

        set({
          activePracticeSession: {
            ...session,
            answersByQuestionId: {
              ...session.answersByQuestionId,
              [q.id]: choiceIndex,
            },
          },
        });
      },

      clearCurrentPracticeAnswer: () => {
        const session = get().activePracticeSession;
        if (!session) return;
        if (session.isSubmitted) return;
        const q = session.questions[session.currentIndex];
        if (!q) return;

        const nextAnswers = { ...session.answersByQuestionId };
        delete nextAnswers[q.id];

        set({
          activePracticeSession: {
            ...session,
            answersByQuestionId: nextAnswers,
          },
        });
      },

      goToPracticeQuestion: (index) => {
        const session = get().activePracticeSession;
        if (!session) return;
        const safeIndex = Math.max(0, Math.min(index, session.questions.length - 1));
        set({
          activePracticeSession: {
            ...session,
            currentIndex: safeIndex,
          },
        });
      },

      goToNextPracticeQuestion: () => {
        const session = get().activePracticeSession;
        if (!session) return;
        const nextIndex = Math.min(session.currentIndex + 1, session.questions.length - 1);
        set({
          activePracticeSession: {
            ...session,
            currentIndex: nextIndex,
          },
        });
      },

      goToPrevPracticeQuestion: () => {
        const session = get().activePracticeSession;
        if (!session) return;
        const prevIndex = Math.max(session.currentIndex - 1, 0);
        set({
          activePracticeSession: {
            ...session,
            currentIndex: prevIndex,
          },
        });
      },

      toggleMarkCurrentPracticeQuestion: () => {
        const session = get().activePracticeSession;
        if (!session) return;
        const q = session.questions[session.currentIndex];
        if (!q) return;

        const current = Boolean(session.markedByQuestionId[q.id]);
        set({
          activePracticeSession: {
            ...session,
            markedByQuestionId: {
              ...session.markedByQuestionId,
              [q.id]: !current,
            },
          },
        });
      },

      submitActivePractice: (todayISO = toISODate(new Date())) => {
        const session = get().activePracticeSession;
        if (!session) return;
        if (session.isSubmitted) return;

        set({
          activePracticeSession: {
            ...session,
            isSubmitted: true,
            submittedAtISO: todayISO,
            isExplanationVisibleByQuestionId: {},
          },
        });
      },

      togglePracticeExplanation: () => {
        const session = get().activePracticeSession;
        if (!session) return;
        if (!session.isSubmitted) return;
        const q = session.questions[session.currentIndex];
        if (!q) return;

        const current = Boolean(session.isExplanationVisibleByQuestionId[q.id]);
        set({
          activePracticeSession: {
            ...session,
            isExplanationVisibleByQuestionId: {
              ...session.isExplanationVisibleByQuestionId,
              [q.id]: !current,
            },
          },
        });
      },

      clearPracticeSession: () => {
        set({ activePracticeSession: undefined });
      },

      startHardTestForGroup: (groupId, questionCount, todayISO = toISODate(new Date())) => {
        const state = get();
        const group = state.groups.find((g) => g.id === groupId);
        if (!group) return;

        const words = group.wordIds.map((id) => state.wordsById[id]).filter(Boolean);
        // If for any reason the set has no loaded words (e.g., stale persisted state),
        // don't start an empty test session.
        if (words.length === 0) {
          set({ activeTestSession: undefined });
          return;
        }
        const globalPoolWords = Object.values(state.wordsById).map((w) => w.word);

        const session = generateTestForSet({
          groupId: group.id,
          groupName: group.name,
          words,
          questionCount,
          globalPoolWords,
          startedAtISO: todayISO,
        });

        set({ activeTestSession: session });
      },

      answerCurrentTestQuestion: (choiceIndex) => {
        const session = get().activeTestSession;
        if (!session) return;
        if (session.isSubmitted) return;

        const q = session.questions[session.currentIndex];
        if (!q) return;

        set({
          activeTestSession: {
            ...session,
            answersByQuestionId: {
              ...session.answersByQuestionId,
              [q.id]: choiceIndex,
            },
          },
        });
      },

      clearCurrentTestAnswer: () => {
        const session = get().activeTestSession;
        if (!session) return;
        if (session.isSubmitted) return;
        const q = session.questions[session.currentIndex];
        if (!q) return;

        const nextAnswers = { ...session.answersByQuestionId };
        delete nextAnswers[q.id];

        set({
          activeTestSession: {
            ...session,
            answersByQuestionId: nextAnswers,
          },
        });
      },

      goToTestQuestion: (index) => {
        const session = get().activeTestSession;
        if (!session) return;
        const safeIndex = Math.max(0, Math.min(index, session.questions.length - 1));
        set({
          activeTestSession: {
            ...session,
            currentIndex: safeIndex,
          },
        });
      },

      goToNextTestQuestion: () => {
        const session = get().activeTestSession;
        if (!session) return;
        const nextIndex = Math.min(session.currentIndex + 1, session.questions.length - 1);
        set({
          activeTestSession: {
            ...session,
            currentIndex: nextIndex,
          },
        });
      },

      goToPrevTestQuestion: () => {
        const session = get().activeTestSession;
        if (!session) return;
        const prevIndex = Math.max(session.currentIndex - 1, 0);
        set({
          activeTestSession: {
            ...session,
            currentIndex: prevIndex,
          },
        });
      },

      toggleMarkCurrentTestQuestion: () => {
        const session = get().activeTestSession;
        if (!session) return;
        const q = session.questions[session.currentIndex];
        if (!q) return;

        const current = Boolean(session.markedByQuestionId[q.id]);
        set({
          activeTestSession: {
            ...session,
            markedByQuestionId: {
              ...session.markedByQuestionId,
              [q.id]: !current,
            },
          },
        });
      },

      submitActiveTest: (todayISO = toISODate(new Date())) => {
        const session = get().activeTestSession;
        if (!session) return;
        if (session.isSubmitted) return;

        set({
          activeTestSession: {
            ...session,
            isSubmitted: true,
            submittedAtISO: todayISO,
            // start with explanations collapsed; user can expand per question.
            isExplanationVisibleByQuestionId: {},
          },
        });
      },

      toggleCurrentExplanation: () => {
        const session = get().activeTestSession;
        if (!session) return;
        if (!session.isSubmitted) return;
        const q = session.questions[session.currentIndex];
        if (!q) return;

        const current = Boolean(session.isExplanationVisibleByQuestionId[q.id]);
        set({
          activeTestSession: {
            ...session,
            isExplanationVisibleByQuestionId: {
              ...session.isExplanationVisibleByQuestionId,
              [q.id]: !current,
            },
          },
        });
      },

      clearTestSession: () => {
        set({ activeTestSession: undefined });
      },

      resetAll: () => {
        set({
          isBootstrapped: false,
          groups: [],
          wordsById: {},
          todos: [],
          practiceQuestionsByChapterId: {},
          activityByDateISO: {},
          streak: { currentStreak: 0, bestStreak: 0, lastGoalHitISO: undefined },
          wallet: { coins: 0, xp: 0, totalReviewed: 0 },
          settings: {
            dailyGoal: 20,
            themeMode: "system",
            speech: { language: "system", voiceId: undefined, rate: 0.95, pitch: 1.0 },
          },
          activeTestSession: undefined,
          activePracticeSession: undefined,
        });
      },

      getTodayActivity: (todayISO = toISODate(new Date())) => {
        const state = get();

        if (cachedTodayISO === todayISO && cachedActivityMapRef === state.activityByDateISO) {
          return cachedTodayActivityRef;
        }

        const next = state.activityByDateISO[todayISO] ?? DEFAULT_DAILY_ACTIVITY;

        cachedTodayISO = todayISO;
        cachedActivityMapRef = state.activityByDateISO;
        cachedTodayActivityRef = next;

        return next;
      },

      getDueWordIds: (todayISO = toISODate(new Date())) => {
        const state = get();

        if (cachedDueISO === todayISO && cachedWordsRefForDue === state.wordsById) {
          return cachedDueIdsRef;
        }

        const next = Object.values(state.wordsById)
          .filter((w) => !w.srs.isNew && w.srs.dueDateISO <= todayISO)
          .sort((a, b) =>
            a.srs.dueDateISO === b.srs.dueDateISO
              ? a.word.localeCompare(b.word)
              : a.srs.dueDateISO.localeCompare(b.srs.dueDateISO)
          )
          .map((w) => w.id);

        cachedDueISO = todayISO;
        cachedWordsRefForDue = state.wordsById;
        cachedDueIdsRef = next;

        return next;
      },

      getNewWordIds: () => {
        const state = get();

        if (cachedWordsRefForNew === state.wordsById) {
          return cachedNewIdsRef;
        }

        const next = Object.values(state.wordsById)
          .filter((w) => w.srs.isNew)
          .map((w) => w.id);

        cachedWordsRefForNew = state.wordsById;
        cachedNewIdsRef = next;

        return next;
      },
    }),
    {
      name: "gre-word-streak-app-store-v2",
      storage: createJSONStorage<PersistedAppState>(() => AsyncStorage),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          // If AsyncStorage read fails, still allow the app to continue with a fresh state.
          console.warn("Failed to rehydrate store", error);
        }
        state?.setHasHydrated(true);
      },
      merge: (persistedState: any, currentState: any) => {
        const merged = { ...currentState, ...persistedState };
        const persistedSettings = persistedState?.settings ?? {};
        merged.settings = { ...currentState.settings, ...persistedSettings };
        merged.settings.speech = {
          ...currentState.settings.speech,
          ...(persistedSettings.speech ?? {}),
        };
        return merged;
      },
      partialize: (state) => ({
        isBootstrapped: state.isBootstrapped,
        groups: state.groups,
        wordsById: state.wordsById,
        todos: state.todos,
        practiceQuestionsByChapterId: state.practiceQuestionsByChapterId,
        activityByDateISO: state.activityByDateISO,
        streak: state.streak,
        wallet: state.wallet,
        settings: state.settings,
        // NOTE: we intentionally do NOT persist activeTestSession (keeps AsyncStorage small and avoids stale sessions)
      }),
    }
  )
);
