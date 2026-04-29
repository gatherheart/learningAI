import { useMemo, useState } from "react";
import { interviewQuestions, type InterviewQuestion } from "@/data/interview";
import { interviewSolved, markInterviewSolved } from "@/lib/store";
import { useProgressVersion } from "@/lib/useProgressVersion";

function groupedLevel(level: InterviewQuestion["level"]) {
  if (level === "junior") return "Junior";
  if (level === "mid") return "Mid";
  return "Senior";
}

function InterviewCard({ question }: { question: InterviewQuestion }) {
  const alreadyDone = interviewSolved(question.id);
  const [selected, setSelected] = useState<number | null>(alreadyDone ? question.answer : null);
  const [state, setState] = useState<"idle" | "wrong" | "right">(alreadyDone ? "right" : "idle");

  function check() {
    if (selected === question.answer) {
      setState("right");
      markInterviewSolved(question.id);
    } else {
      setState("wrong");
    }
  }

  return (
    <section className="rounded-[26px] border border-white/10 bg-zinc-950/80 p-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-sky-300/25 bg-sky-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-sky-100">
          {groupedLevel(question.level)}
        </span>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-zinc-400">
          {question.topic}
        </span>
      </div>
      <h2 className="text-xl font-semibold text-zinc-50">{question.title}</h2>
      <div className="mt-3 space-y-2 text-sm leading-7 text-zinc-300">
        {question.prompt.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
      <div className="mt-4 space-y-2">
        {question.options.map((option, index) => (
          <label
            key={option}
            className={`flex items-start gap-2 rounded border p-3 text-sm ${
              selected === index
                ? "border-sky-400/60 bg-sky-500/10"
                : "border-white/10 bg-white/[0.03] hover:border-sky-400/30"
            } ${alreadyDone ? "cursor-default" : "cursor-pointer"}`}
          >
            <input
              type="radio"
              name={question.id}
              checked={selected === index}
              disabled={alreadyDone}
              onChange={() => setSelected(index)}
              className="mt-0.5"
            />
            <span className="text-zinc-100">{option}</span>
          </label>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-3">
        {!alreadyDone && (
          <button
            onClick={check}
            disabled={selected === null}
            className="rounded-2xl bg-sky-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-400 disabled:bg-zinc-700"
          >
            Check
          </button>
        )}
        {state === "right" && <span className="text-sm font-medium text-emerald-300">✓ Correct!</span>}
      </div>
      {state !== "idle" && (
        <div
          className={`mt-4 rounded-[22px] border px-4 py-3 text-sm leading-7 ${
            state === "right"
              ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-100"
              : "border-red-400/25 bg-red-500/10 text-red-100"
          }`}
        >
          {question.explanation}
        </div>
      )}
    </section>
  );
}

export function Interview() {
  const progressVersion = useProgressVersion();
  const solved = useMemo(
    () => interviewQuestions.filter((question) => interviewSolved(question.id)).length,
    [progressVersion],
  );
  const groups = useMemo(
    () => ({
      junior: interviewQuestions.filter((question) => question.level === "junior"),
      mid: interviewQuestions.filter((question) => question.level === "mid"),
      senior: interviewQuestions.filter((question) => question.level === "senior"),
    }),
    [],
  );

  return (
    <main className="app-scrollbar flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.16),transparent_24%),linear-gradient(180deg,rgba(9,9,11,0.86),rgba(9,9,11,0.98))]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 lg:px-6 lg:py-6">
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.75fr)]">
          <div className="rounded-[30px] border border-white/10 bg-zinc-950/85 p-6 shadow-2xl shadow-black/25">
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-sky-300/25 bg-sky-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-sky-100">
                interview mode
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-zinc-400">
                ai deep dive
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-50 lg:text-4xl">
              AI Interview Questions
            </h1>
            <div className="mt-4 max-w-3xl space-y-3 text-base leading-8 text-zinc-300">
              <p>This section is for explanation-heavy AI and LLM interview reasoning rather than vocabulary-level model summaries.</p>
              <p>The emphasis is on representation, optimization, architecture, evaluation, serving, failure modes, and systems tradeoffs.</p>
            </div>
          </div>
          <div className="rounded-[30px] border border-white/10 bg-[#0d1117] p-5 shadow-2xl shadow-black/20">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-xs uppercase tracking-[0.14em] text-zinc-500">progress</div>
              <div className="rounded-full border border-white/10 px-3 py-1 font-mono text-[11px] text-zinc-300">
                {solved}/{interviewQuestions.length}
              </div>
            </div>
            <div className="mb-4 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-400 to-cyan-300 transition-all"
                style={{ width: `${Math.round((solved / interviewQuestions.length) * 100) || 0}%` }}
              />
            </div>
            <div className="space-y-3 text-sm leading-7 text-zinc-300">
              <p>Junior questions check model-building-block understanding and basic learning mechanics.</p>
              <p>Mid questions focus on optimization, evaluation, tokenization, attention, and training behavior.</p>
              <p>Senior questions shift toward serving, RAG, alignment, scaling, and end-to-end system tradeoffs.</p>
            </div>
          </div>
        </section>

        {(["junior", "mid", "senior"] as const).map((level) => (
          <section key={level} className="space-y-4">
            <div className="rounded-[24px] border border-white/10 bg-zinc-950/75 px-5 py-4">
              <div className="text-xs uppercase tracking-[0.14em] text-zinc-500">{level}</div>
              <h2 className="text-xl font-semibold text-zinc-50">{groupedLevel(level)} Interview Track</h2>
            </div>
            <div className="grid gap-4">
              {groups[level].map((question) => (
                <InterviewCard key={question.id} question={question} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
