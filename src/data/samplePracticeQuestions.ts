export type PracticeQuestionSeed = {
  prompt: string;
  choices: [string, string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3 | 4;
  explanation: string;
};

export const SAMPLE_PRACTICE_QUESTIONS_BY_CHAPTER_ID: Record<string, PracticeQuestionSeed[]> = {
  // NOTE: These are original sample questions (not from any copyrighted book).
  "quant-07-arithmetic": [
    {
      prompt: "If (3/5)x = 24, what is x?",
      choices: ["30", "35", "40", "45", "50"],
      correctIndex: 2,
      explanation: "Multiply both sides by 5/3: x = 24 × (5/3) = 8 × 5 = 40.",
    },
    {
      prompt:
        "A jacket is discounted by 20%, and then the discounted price is increased by 10% sales tax.\nIf the original price was $100, what is the final price (in dollars)?",
      choices: ["80", "88", "90", "92", "110"],
      correctIndex: 1,
      explanation: "Discount: 100 × 0.8 = 80. Tax: 80 × 1.1 = 88.",
    },
    {
      prompt: "If a/b = 3/7 and b/c = 5/2, what is a/c?",
      choices: ["15/7", "14/15", "15/14", "21/10", "10/21"],
      correctIndex: 2,
      explanation: "Multiply the ratios: a/c = (a/b)×(b/c) = (3/7)×(5/2) = 15/14.",
    },
    {
      prompt:
        "When n is divided by 5, the remainder is 3.\nWhat is the remainder when 2n + 1 is divided by 5?",
      choices: ["0", "1", "2", "3", "4"],
      correctIndex: 2,
      explanation:
        "Let n = 5k + 3. Then 2n + 1 = 2(5k + 3) + 1 = 10k + 7. When divided by 5, 7 leaves remainder 2.",
    },
    {
      prompt:
        "The ratio of sugar to flour in a recipe is 2:5.\nIf there are 12 cups of sugar, how many cups of flour are there?",
      choices: ["20", "24", "30", "36", "42"],
      correctIndex: 2,
      explanation: "2 parts sugar = 12 ⇒ 1 part = 6. Flour is 5 parts ⇒ 5×6 = 30.",
    },
    {
      prompt:
        "If x is 15% of y and y is 40% of z, x is what percent of z?",
      choices: ["4%", "6%", "10%", "15%", "25%"],
      correctIndex: 1,
      explanation: "x = 0.15y and y = 0.40z ⇒ x = 0.15×0.40 z = 0.06z = 6% of z.",
    },
    {
      prompt:
        "A number is increased by 25% and then decreased by 20%.\nCompared to the original number, the final number is",
      choices: ["10% less", "5% less", "unchanged", "5% more", "10% more"],
      correctIndex: 2,
      explanation: "Multiply factors: 1.25 × 0.80 = 1.00, so the number is unchanged.",
    },
    {
      prompt:
        "The average (arithmetic mean) of 4 numbers is 18.\nIf three of the numbers are 14, 20, and 22, what is the fourth number?",
      choices: ["12", "14", "16", "18", "20"],
      correctIndex: 2,
      explanation: "Sum of 4 numbers = 18×4 = 72. Known sum = 14+20+22 = 56. Fourth = 72−56 = 16.",
    },
    {
      prompt:
        "If 2/3 of a number is 10 more than 1/2 of the same number, what is the number?",
      choices: ["30", "40", "50", "60", "90"],
      correctIndex: 3,
      explanation:
        "Let the number be n. (2/3)n = (1/2)n + 10 ⇒ (4/6 − 3/6)n = 10 ⇒ (1/6)n = 10 ⇒ n = 60.",
    },
    {
      prompt: "If 7 is 2% of x, what is x?",
      choices: ["140", "175", "280", "350", "700"],
      correctIndex: 3,
      explanation: "2% of x is 0.02x. So 0.02x = 7 ⇒ x = 7 / 0.02 = 350.",
    },
  ],
};

