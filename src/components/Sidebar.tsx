import { useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { Lesson } from "@/types";
import { interviewSolved, isLessonUnlocked, lessonProgress } from "@/lib/store";
import { useProgressVersion } from "@/lib/useProgressVersion";
import { interviewQuestions } from "@/data/interview";

interface Props {
  lessons: Lesson[];
}

export function Sidebar({ lessons }: Props) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const progressVersion = useProgressVersion();

  const totalDone = useMemo(() => lessons.filter((lesson) => lessonProgress(lesson.id, lesson.quizzes.length).done).length, [lessons, progressVersion]);
  const percent = lessons.length === 0 ? 0 : Math.round((totalDone / lessons.length) * 100);
  const solvedInterview = useMemo(() => interviewQuestions.filter((question) => interviewSolved(question.id)).length, [progressVersion]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return lessons
      .map((lesson, index) => ({ lesson, index }))
      .filter(({ lesson }) => {
        if (!normalized) return true;
        const title = String(t(`lessons.${lesson.id}.title`)).toLowerCase();
        const topic = String(t(`topics.${lesson.topic}`)).toLowerCase();
        return title.includes(normalized) || topic.includes(normalized) || lesson.id.toLowerCase().includes(normalized);
      });
  }, [lessons, query, t]);

  return (
    <aside className="border-b border-white/10 bg-zinc-950/80 lg:w-[360px] lg:shrink-0 lg:border-b-0 lg:border-r">
      <div className="app-scrollbar flex h-full flex-col overflow-y-auto">
        <div className="border-b border-white/10 px-4 py-4 lg:px-5">
          <div className="rounded-[24px] border border-orange-400/15 bg-gradient-to-br from-orange-500/12 via-zinc-950 to-zinc-950 px-4 py-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.14em] text-orange-200/70">Course map</div>
                <h2 className="mt-1 text-xl font-semibold text-zinc-50">{t("ui.lessons")}</h2>
              </div>
              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-xs text-zinc-300">{totalDone}/{lessons.length}</div>
            </div>
            <div className="mb-3 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-orange-500 via-amber-400 to-lime-300 transition-all" style={{ width: `${percent}%` }} />
            </div>
            <p className="text-sm leading-6 text-zinc-300">{t("ui.keyboardHint")}</p>
          </div>
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-1.5">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={String(t("ui.search"))}
              className="w-full rounded-xl border border-transparent bg-transparent px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500"
            />
          </div>
        </div>
        <div className="space-y-3 px-3 py-4 lg:px-4">
          {filtered.map(({ lesson, index }) => {
            const unlocked = isLessonUnlocked(index, lessons);
            const progress = lessonProgress(lesson.id, lesson.quizzes.length);
            return (
              <NavLink
                key={lesson.id}
                to={unlocked ? `/lesson/${lesson.id}` : "#"}
                onClick={(event) => { if (!unlocked) event.preventDefault(); }}
                className={({ isActive }) => [
                  "block rounded-[22px] border px-4 py-4 transition",
                  unlocked
                    ? "border-white/10 bg-white/[0.04] hover:border-orange-400/35 hover:bg-orange-500/8"
                    : "cursor-not-allowed border-white/6 bg-white/[0.02] opacity-60"
                  , isActive && unlocked ? "border-orange-300/55 bg-orange-500/12 shadow-lg shadow-orange-950/25" : ""].filter(Boolean).join(" ")}
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="mb-1 font-mono text-xs text-zinc-500">{lesson.id}</div>
                    <div className="text-sm font-medium text-zinc-100">{t(`lessons.${lesson.id}.title`)}</div>
                  </div>
                  <div className="rounded-full border border-white/10 px-2.5 py-1 font-mono text-[11px] text-zinc-400">
                    {progress.done ? "done" : `${progress.completed}/${progress.total}`}
                  </div>
                </div>
                <div className="mb-3 text-xs uppercase tracking-[0.2em] text-zinc-500">{t(`topics.${lesson.topic}`)}</div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-gradient-to-r from-orange-400 to-amber-300 transition-all" style={{ width: `${Math.round((progress.completed / progress.total) * 100) || 0}%` }} />
                </div>
              </NavLink>
            );
          })}
          <NavLink
            to="/interview"
            className={({ isActive }) =>
              [
                "block rounded-[22px] border px-4 py-4 transition",
                "border-sky-400/18 bg-sky-500/8 hover:border-sky-300/35 hover:bg-sky-500/12",
                isActive && "border-sky-300/55 bg-sky-500/14 shadow-lg shadow-sky-950/25",
              ]
                .filter(Boolean)
                .join(" ")
            }
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-[0.14em] text-sky-100/70">
                  interview mode
                </div>
                <div className="text-sm font-medium text-zinc-100">Interview Deep Dive</div>
              </div>
              <div className="rounded-full border border-white/10 px-2.5 py-1 font-mono text-[11px] text-zinc-300">
                {solvedInterview}/{interviewQuestions.length}
              </div>
            </div>
            <div className="mb-3 text-sm leading-6 text-zinc-300">
              Harder junior, mid, and senior interview questions on tradeoffs, runtime behavior, and architecture.
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-400 to-cyan-300"
                style={{
                  width: `${Math.round((solvedInterview / interviewQuestions.length) * 100) || 0}%`,
                }}
              />
            </div>
          </NavLink>
        </div>
      </div>
    </aside>
  );
}
