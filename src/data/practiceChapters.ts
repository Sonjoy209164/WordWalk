export type PracticeChapterSection = "Quant" | "Verbal" | "Writing" | "Appendix";

export type PracticeChapter = {
  id: string;
  section: PracticeChapterSection;
  order: number;
  label: string;
  title: string;
};

export const PRACTICE_CHAPTERS: PracticeChapter[] = [
  { id: "quant-07-arithmetic", section: "Quant", order: 7, label: "7", title: "Arithmetic" },
  { id: "quant-08-algebra", section: "Quant", order: 8, label: "8", title: "Algebra" },
  {
    id: "quant-09-inequalities-absolute-values",
    section: "Quant",
    order: 9,
    label: "9",
    title: "Inequalities and Absolute Values",
  },
  {
    id: "quant-10-functions-formulas-sequences",
    section: "Quant",
    order: 10,
    label: "10",
    title: "Functions, Formulas, and Sequences",
  },
  {
    id: "quant-11-fractions-decimals",
    section: "Quant",
    order: 11,
    label: "11",
    title: "Fractions and Decimals",
  },
  { id: "quant-12-percents", section: "Quant", order: 12, label: "12", title: "Percents" },
  {
    id: "quant-13-divisibility-primes",
    section: "Quant",
    order: 13,
    label: "13",
    title: "Divisibility and Primes",
  },
  {
    id: "quant-14-exponents-roots",
    section: "Quant",
    order: 14,
    label: "14",
    title: "Exponents and Roots",
  },
  {
    id: "quant-15-number-properties",
    section: "Quant",
    order: 15,
    label: "15",
    title: "Number Properties",
  },
  { id: "quant-16-word-problems", section: "Quant", order: 16, label: "16", title: "Word Problems" },
  {
    id: "quant-17-two-variable-word-problems",
    section: "Quant",
    order: 17,
    label: "17",
    title: "Two-Variable Word Problems",
  },
  { id: "quant-18-rates-work", section: "Quant", order: 18, label: "18", title: "Rates and Work" },
  {
    id: "quant-19-variables-in-the-choices",
    section: "Quant",
    order: 19,
    label: "19",
    title: "Variables-in-the-Choices Problems",
  },
  { id: "quant-20-ratios", section: "Quant", order: 20, label: "20", title: "Ratios" },
  {
    id: "quant-21-averages-weighted-median-mode",
    section: "Quant",
    order: 21,
    label: "21",
    title: "Averages, Weighted Averages, Median, and Mode",
  },
  {
    id: "quant-22-standard-deviation-normal-distribution",
    section: "Quant",
    order: 22,
    label: "22",
    title: "Standard Deviation and Normal Distribution",
  },
  {
    id: "quant-23-probability-combinatorics-overlapping-sets",
    section: "Quant",
    order: 23,
    label: "23",
    title: "Probability, Combinatorics, and Overlapping Sets",
  },
  {
    id: "quant-24-data-interpretation",
    section: "Quant",
    order: 24,
    label: "24",
    title: "Data Interpretation",
  },
  {
    id: "quant-25-polygons-rectangular-solids",
    section: "Quant",
    order: 25,
    label: "25",
    title: "Polygons and Rectangular Solids",
  },
  {
    id: "quant-26-circles-cylinders",
    section: "Quant",
    order: 26,
    label: "26",
    title: "Circles and Cylinders",
  },
  { id: "quant-27-triangles", section: "Quant", order: 27, label: "27", title: "Triangles" },
  {
    id: "quant-28-coordinate-geometry",
    section: "Quant",
    order: 28,
    label: "28",
    title: "Coordinate Geometry",
  },
  { id: "quant-29-mixed-geometry", section: "Quant", order: 29, label: "29", title: "Mixed Geometry" },
  { id: "quant-30-advanced-quant", section: "Quant", order: 30, label: "30", title: "Advanced Quant" },
  { id: "writing-31-essays", section: "Writing", order: 31, label: "31", title: "Essays" },
  {
    id: "verbal-32-verbal-practice-sections",
    section: "Verbal",
    order: 32,
    label: "32",
    title: "Verbal Practice Sections",
  },
  {
    id: "quant-33-math-practice-sections",
    section: "Quant",
    order: 33,
    label: "33",
    title: "Math Practice Sections",
  },
  {
    id: "appendix-a-math-facts",
    section: "Appendix",
    order: 1001,
    label: "A",
    title: "Math Facts (Reference)",
  },
  {
    id: "appendix-b-math-drills",
    section: "Appendix",
    order: 1002,
    label: "B",
    title: "Math Drills",
  },
];

export function getPracticeChapterById(chapterId: string): PracticeChapter | undefined {
  return PRACTICE_CHAPTERS.find((c) => c.id === chapterId);
}

