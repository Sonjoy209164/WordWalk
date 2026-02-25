import { SrsState } from "../utils/sm2";

export interface SeedWord {
  id: number;
  word: string;
  synonym: string;
  sentence: string;
}

export interface SeedGroup {
  id: number;
  name: string;
  words: SeedWord[];
}

export interface SeedData {
  groups: SeedGroup[];
}

export interface WordEntity {
  id: string; // stable unique key inside the app
  groupId: number;
  groupName: string;
  word: string;
  synonym: string;
  sentence: string;
  isStarred: boolean;
  srs: SrsState;
  stats: {
    timesReviewed: number;
    lastReviewedAtISO?: string;
  };
}

export interface GroupEntity {
  id: number;
  name: string;
  wordIds: string[];
}

export interface TodoEntity {
  id: string;
  title: string;
  dueDateISO: string;
  isCompleted: boolean;
  createdAtISO: string;
}

export interface DailyActivity {
  reviewedCount: number;
  didHitGoal: boolean;
}

export interface PracticeQuestion {
  id: string;
  chapterId: string;
  prompt: string;
  choices: string[]; // 4 (A–D, QC) or 5 (A–E, MC)
  correctIndex: number; // 0..choices.length-1
  explanation: string;
  createdAtISO: string;
  updatedAtISO?: string;
}
