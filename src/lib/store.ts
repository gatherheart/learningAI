import type { Quiz } from "@/types";

const KEY = "learningAI:progress:v1";
const EVENT_NAME = "learningAI:progress";

interface Progress {
  completedQuizzes: Record<string, true>;
  solvedInterview?: Record<string, true>;
}

function read(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { completedQuizzes: {} };
    return JSON.parse(raw) as Progress;
  } catch {
    return { completedQuizzes: {} };
  }
}

function write(progress: Progress) {
  localStorage.setItem(KEY, JSON.stringify(progress));
  window.dispatchEvent(new Event(EVENT_NAME));
}

export function isQuizCompleted(lessonId: string, quizId: string): boolean {
  return read().completedQuizzes[`${lessonId}:${quizId}`] === true;
}

export function markQuizCompleted(lessonId: string, quizId: string): void {
  const progress = read();
  progress.completedQuizzes[`${lessonId}:${quizId}`] = true;
  write(progress);
}

export function lessonProgress(lessonId: string, quizzes: Quiz[]): { completed: number; total: number; done: boolean } {
  const progress = read();
  let completed = 0;
  for (const key of Object.keys(progress.completedQuizzes)) {
    if (key.startsWith(`${lessonId}:`)) completed++;
  }
  return { completed, total: quizzes.length, done: completed >= quizzes.length };
}

export function isLessonUnlocked(lessonIndex: number, lessons: { id: string; quizzes: Quiz[] }[]): boolean {
  if (lessonIndex === 0) return true;
  const previous = lessons[lessonIndex - 1];
  return lessonProgress(previous.id, previous.quizzes).done;
}

export function resetProgress(): void {
  localStorage.removeItem(KEY);
}


export function interviewSolved(questionId: string): boolean {
  return read().solvedInterview?.[questionId] === true;
}

export function markInterviewSolved(questionId: string): void {
  const progress = read();
  progress.solvedInterview ??= {};
  progress.solvedInterview[questionId] = true;
  write(progress);
}
