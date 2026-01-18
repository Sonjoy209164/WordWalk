import { ReviewRating } from "./sm2";

export function coinRewardForRating(rating: ReviewRating): number {
  // Incentivize effort, not gaming ("easy" shouldn't always pay max).
  switch (rating) {
    case "again":
      return 1;
    case "hard":
      return 2;
    case "good":
      return 2;
    case "easy":
      return 3;
  }
}

export function xpRewardForRating(rating: ReviewRating): number {
  switch (rating) {
    case "again":
      return 6;
    case "hard":
      return 10;
    case "good":
      return 9;
    case "easy":
      return 8;
  }
}

export interface BadgeDefinition {
  id: string;
  title: string;
  description: string;
  isUnlocked: (stats: { bestStreak: number; totalReviewed: number; coins: number }) => boolean;
}

export const BADGES: BadgeDefinition[] = [
  {
    id: "streak-3",
    title: "3-Day Streak",
    description: "Hit your daily goal for 3 days in a row.",
    isUnlocked: (stats) => stats.bestStreak >= 3,
  },
  {
    id: "streak-7",
    title: "7-Day Streak",
    description: "One full week of consistency.",
    isUnlocked: (stats) => stats.bestStreak >= 7,
  },
  {
    id: "streak-14",
    title: "14-Day Streak",
    description: "Two weeks. You're dangerous now.",
    isUnlocked: (stats) => stats.bestStreak >= 14,
  },
  {
    id: "streak-30",
    title: "30-Day Streak",
    description: "A month of daily momentum.",
    isUnlocked: (stats) => stats.bestStreak >= 30,
  },
  {
    id: "review-100",
    title: "100 Reviews",
    description: "Reviewed 100 words (total).",
    isUnlocked: (stats) => stats.totalReviewed >= 100,
  },
  {
    id: "review-500",
    title: "500 Reviews",
    description: "Reviewed 500 words (total).",
    isUnlocked: (stats) => stats.totalReviewed >= 500,
  },
  {
    id: "coins-250",
    title: "Quarter K",
    description: "Earned 250 coins.",
    isUnlocked: (stats) => stats.coins >= 250,
  },
];
