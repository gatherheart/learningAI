import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { Lesson } from "@/types";
import { lessonProgress } from "@/lib/store";
import { useProgressVersion } from "@/lib/useProgressVersion";

interface Props {
  lessons: Lesson[];
}

export function Home({ lessons }: Props) {
  const { t } = useTranslation();
  useProgressVersion();
  const firstLesson = lessons[0];
  const completed = lessons.filter((lesson) => lessonProgress(lesson.id, lesson.quizzes.length).done).length;
  const nextLesson = lessons.find((lesson) => !lessonProgress(lesson.id, lesson.quizzes.length).done);

  return (
    <main className="app-scrollbar flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top_right,rgba(251,146,60,0.16),transparent_28%),linear-gradient(180deg,rgba(9,9,11,0.92),rgba(9,9,11,0.98))]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 lg:px-6 lg:py-6">
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.85fr)]">
          <div className="rounded-[30px] border border-white/10 bg-zinc-950/85 p-6 shadow-2xl shadow-black/25 lg:p-8">
            <div className="mb-6 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-orange-400/30 bg-orange-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-orange-200">{t("ui.learnByDoing")}</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-zinc-400">{lessons.length} lessons</span>
            </div>
            <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-zinc-50 lg:text-5xl">{t("ui.heroTitle")}</h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-zinc-300 lg:text-lg">{t("ui.heroBody")}</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              {firstLesson && <Link to={`/lesson/${nextLesson?.id ?? firstLesson.id}`} className="rounded-2xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-400">{t("ui.startLearning")}</Link>}
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-300">{completed}/{lessons.length} lessons cleared</div>
            </div>
          </div>
          <div className="rounded-[30px] border border-white/10 bg-[#0d1117] p-5 shadow-2xl shadow-black/20">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-xs uppercase tracking-[0.16em] text-zinc-500">{t("ui.previewLabel")}</div>
              <div className="flex gap-2"><span className="h-3 w-3 rounded-full bg-red-400/80" /><span className="h-3 w-3 rounded-full bg-amber-300/80" /><span className="h-3 w-3 rounded-full bg-emerald-400/80" /></div>
            </div>
            <div className="space-y-3 font-mono text-sm leading-7 text-zinc-300">
              <div><span className="text-emerald-300">$</span> python main.py</div>
              <div className="text-zinc-500">{t("ui.previewStatus")}</div>
              <div className="text-orange-200">{t("ui.homeTip")}</div>
            </div>
          </div>
        </section>
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="rounded-[28px] border border-white/10 bg-zinc-950/80 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-50">{t("ui.lessonList")}</h2>
              <div className="text-xs uppercase tracking-[0.14em] text-zinc-500">order</div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {lessons.map((lesson, index) => {
                const done = lessonProgress(lesson.id, lesson.quizzes.length).done;
                return (
                  <Link key={lesson.id} to={`/lesson/${lesson.id}`} className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4 transition hover:border-orange-400/35 hover:bg-orange-500/8">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-mono text-xs text-zinc-500">{String(index + 1).padStart(2, "0")}</span>
                      <span className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">{done ? "done" : "open"}</span>
                    </div>
                    <div className="text-sm font-medium text-zinc-100">{lesson.title}</div>
                    <div className="mt-2 text-xs uppercase tracking-[0.18em] text-zinc-500">{t(`topics.${lesson.topic}`)}</div>
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="rounded-[28px] border border-white/10 bg-zinc-950/80 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-50">{t("ui.howItWorks")}</h2>
              <div className="text-xs uppercase tracking-[0.14em] text-zinc-500">overview</div>
            </div>
            <div className="space-y-3">
              {[t("ui.howItWorks1"), t("ui.howItWorks2"), t("ui.howItWorks3")].map((item, index) => (
                <div key={item} className="flex gap-4 rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-orange-500/10 font-mono text-sm text-orange-200">{index + 1}</div>
                  <p className="text-sm leading-7 text-zinc-300">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
