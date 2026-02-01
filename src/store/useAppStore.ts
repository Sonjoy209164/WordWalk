import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { toISODate, isYesterday } from "../utils/date";
import { applySm2, makeNewSrsState, ReviewRating } from "../utils/sm2";
import { coinRewardForRating, xpRewardForRating } from "../utils/rewards";
import { generateTestForSet, type GreTestSession } from "../utils/greTest";
import type { DailyActivity, GroupEntity, SeedData, TodoEntity, WordEntity } from "./types";

type ThemeMode = "system" | "light" | "dark";

export interface AppState {
  hasHydrated: boolean;
  isBootstrapped: boolean;

  groups: GroupEntity[];
  wordsById: Record<string, WordEntity>;
  todos: TodoEntity[];

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
  };

  // ---- Test mode (GRE-style)
  activeTestSession?: GreTestSession;

  setHasHydrated: (hasHydrated: boolean) => void;

  bootstrapFromSeed: (seed: SeedData) => void;
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

  setDailyGoal: (dailyGoal: number) => void;
  setThemeMode: (themeMode: ThemeMode) => void;

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
  persist(
    (set, get) => ({
      hasHydrated: false,
      isBootstrapped: false,

      groups: [],
      wordsById: {},
      todos: [],

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
      },

      activeTestSession: undefined,

      setHasHydrated: (hasHydrated) => set({ hasHydrated }),

      bootstrapFromSeed: (seed) => {
        const existingWordCount = Object.keys(get().wordsById).length;
        if (existingWordCount > 0) {
          const state = get();
          const existingGroupIds = new Set(state.groups.map((g) => g.id));
          const missingSeedGroups = seed.groups.filter((g) => !existingGroupIds.has(g.id));

          if (missingSeedGroups.length === 0) {
            if (!state.isBootstrapped) set({ isBootstrapped: true });
            return;
          }

          const todayISO = toISODate(new Date());
          const nextGroups: GroupEntity[] = [...state.groups];
          const nextWordsById: Record<string, WordEntity> = { ...state.wordsById };

          for (const group of missingSeedGroups) {
            const wordIds: string[] = [];
            for (const seedWord of group.words) {
              const appWordId = `${group.id}-${seedWord.id}`;
              if (nextWordsById[appWordId]) continue;
              wordIds.push(appWordId);

              nextWordsById[appWordId] = {
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

            nextGroups.push({
              id: group.id,
              name: group.name,
              wordIds,
            });
          }

          nextGroups.sort((a, b) => a.id - b.id);

          set({
            isBootstrapped: true,
            groups: nextGroups,
            wordsById: nextWordsById,
          });
          return;
        }

        const todayISO = toISODate(new Date());

        const groups: GroupEntity[] = [];
        const wordsById: Record<string, WordEntity> = {};

        for (const group of seed.groups) {
          const wordIds: string[] = [];
          for (const seedWord of group.words) {
            const appWordId = `${group.id}-${seedWord.id}`;
            wordIds.push(appWordId);

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
          activityByDateISO: {},
          streak: { currentStreak: 0, bestStreak: 0, lastGoalHitISO: undefined },
          wallet: { coins: 0, xp: 0, totalReviewed: 0 },
          settings: { dailyGoal: 20, themeMode: "system" },
          activeTestSession: undefined,
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
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          // If AsyncStorage read fails, still allow the app to continue with a fresh state.
          console.warn("Failed to rehydrate store", error);
        }
        state?.setHasHydrated(true);
      },
      partialize: (state) => ({
        isBootstrapped: state.isBootstrapped,
        groups: state.groups,
        wordsById: state.wordsById,
        todos: state.todos,
        activityByDateISO: state.activityByDateISO,
        streak: state.streak,
        wallet: state.wallet,
        settings: state.settings,
        // NOTE: we intentionally do NOT persist activeTestSession (keeps AsyncStorage small and avoids stale sessions)
      }),
    }
  )
);
