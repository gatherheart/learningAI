export type QuizType =
  | "predict-output"
  | "multiple-choice"
  | "fill-in-blank"
  | "spot-the-bug"
  | "order-statements";

export interface QuizPredictOutput {
  id: string;
  type: "predict-output";
}

export interface QuizMultipleChoice {
  id: string;
  type: "multiple-choice";
  answer: number;
}

export interface QuizFillInBlank {
  id: string;
  type: "fill-in-blank";
  template: string; // code containing one or more "___" placeholders
  blanks: string[]; // accepted answer per blank, in order
}

export interface QuizSpotTheBug {
  id: string;
  type: "spot-the-bug";
  code: string; // multi-line code, user picks a buggy line
  buggyLine: number; // 1-indexed
}

export interface QuizOrderStatements {
  id: string;
  type: "order-statements";
  answer: number[]; // expected order; each entry is an index into the options array (from i18n)
}

export type Quiz =
  | QuizPredictOutput
  | QuizMultipleChoice
  | QuizFillInBlank
  | QuizSpotTheBug
  | QuizOrderStatements;

export interface Lesson {
  id: string;
  bin: string;
  topic: string;
  code: string;
  expectedOutput: string;
  quizzes: Quiz[];
}

export interface ProblemSample {
  input: string;
  output: string;
}

export interface Problem {
  id: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  summary: string;
  inputFormat: string[];
  outputFormat: string[];
  approach: string[];
  samples: ProblemSample[];
  starterCode: string;
}

export interface DeepDiveQuestion {
  id: string;
  topic: string;
  title: string;
  scenario: string[];
  question: string;
  options: string[];
  answer: number;
  explanation: string;
}
