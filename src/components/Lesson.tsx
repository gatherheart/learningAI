import { useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { Lesson as LessonT } from "@/types";
import { CodeBlock } from "@/components/CodeBlock";
import { LessonDescription } from "@/components/LessonDescription";
import { PredictOutput } from "@/components/quiz/PredictOutput";
import { MultipleChoice } from "@/components/quiz/MultipleChoice";
import { useKeyboardNav } from "@/lib/keyboardNav";
import { lessonProgress } from "@/lib/store";
import { useProgressVersion } from "@/lib/useProgressVersion";

interface Props {
  lessons: LessonT[];
}

export function Lesson({ lessons }: Props) {
  const { id } = useParams();
  const { t } = useTranslation();
  const [, setRefresh] = useState(0);
  useProgressVersion();
  useKeyboardNav(lessons, id);
  const lesson = lessons.find((entry) => entry.id === id);

  if (!lesson) {
    return <main className="flex flex-1 items-center justify-center p-8 text-zinc-400">{t("ui.lessonNotFound")}</main>;
  }

  const refresh = () => setRefresh((value) => value + 1);
  const progress = lessonProgress(lesson.id, lesson.quizzes.length);
  const lessonIndex = lessons.findIndex((entry) => entry.id === lesson.id);
  const allDone = lessons.every((entry) => lessonProgress(entry.id, entry.quizzes.length).done);

  return (
    <main className="app-scrollbar flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top_right,rgba(251,146,60,0.16),transparent_24%),linear-gradient(180deg,rgba(9,9,11,0.86),rgba(9,9,11,0.98))]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 lg:px-6 lg:py-6">
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.75fr)]">
          <div className="rounded-[30px] border border-white/10 bg-zinc-950/85 p-6 shadow-2xl shadow-black/25">
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-orange-400/30 bg-orange-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-orange-200">lesson {String(lessonIndex + 1).padStart(2, "0")}</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-zinc-400">{t(`topics.${lesson.topic}`)}</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-50 lg:text-4xl">{t(`lessons.${lesson.id}.title`)}</h1>
            <LessonDescription content={t(`lessons.${lesson.id}.description`) as string} />
          </div>
          <div className="rounded-[30px] border border-white/10 bg-[#0d1117] p-5 shadow-2xl shadow-black/20">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-xs uppercase tracking-[0.14em] text-zinc-500">progress</div>
              <div className="rounded-full border border-white/10 px-3 py-1 font-mono text-[11px] text-zinc-300">{progress.completed}/{progress.total}</div>
            </div>
            <div className="mb-4 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-orange-500 via-amber-400 to-lime-300 transition-all" style={{ width: `${Math.round((progress.completed / progress.total) * 100) || 0}%` }} />
            </div>
            <div className="space-y-3 font-mono text-sm leading-7 text-zinc-300">
              <div><span className="text-emerald-300">$</span> {lesson.bin}</div>
              <div className="text-zinc-500">expected topic: {t(`topics.${lesson.topic}`)}</div>
              <div className="text-orange-200">Open the external workspace if you want to run or extend the code outside this lesson page.</div>
              <div className={progress.done ? "text-emerald-300" : "text-amber-200"}>{progress.done ? "status: unlocked next lesson" : "status: quizzes still pending"}</div>
              <div className="text-zinc-500">keyboard: left/right arrows for lesson navigation</div>
            </div>
            {allDone && <div className="mt-5 rounded-[22px] border border-emerald-400/25 bg-emerald-500/10 p-4 text-sm text-emerald-100">{t("ui.courseComplete")}</div>}
          </div>
        </section>
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
          <div className="space-y-6">
            <CodeBlock code={lesson.code} expectedOutput={lesson.expectedOutput} />
          </div>
          <div className="space-y-4">
            <div className="rounded-[28px] border border-white/10 bg-zinc-950/80 p-5">
              <div className="mb-1 text-xs uppercase tracking-[0.14em] text-zinc-500">quiz set</div>
              <h2 className="text-xl font-semibold text-zinc-50">{t("ui.quizzes")}</h2>
              <p className="mt-2 text-sm leading-7 text-zinc-300">Finish every quiz in this lesson to unlock the next one.</p>
            </div>
            {progress.done && <div className="rounded-[24px] border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">{t("ui.lessonComplete")}</div>}
            {lesson.quizzes.map((quiz) => {
              switch (quiz.type) {
                case "predict-output":
                  return <PredictOutput key={`${lesson.id}-${quiz.id}`} lessonId={lesson.id} quizId={quiz.id} expectedOutput={lesson.expectedOutput} onSolved={refresh} />;
                case "multiple-choice":
                  return <MultipleChoice key={`${lesson.id}-${quiz.id}`} lessonId={lesson.id} quizId={quiz.id} answer={quiz.answer} onSolved={refresh} />;
                default:
                  return null;
              }
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
