import { useState } from "react";
import { useTranslation } from "react-i18next";
import { isQuizCompleted, markQuizCompleted } from "@/lib/store";

interface Props {
  lessonId: string;
  quizId: string;
  code: string;
  buggyLine: number;
  onSolved: () => void;
}

export function SpotTheBug({ lessonId, quizId, code, buggyLine, onSolved }: Props) {
  const { t } = useTranslation();
  const alreadyDone = isQuizCompleted(lessonId, quizId);
  const [selected, setSelected] = useState<number | null>(
    alreadyDone ? buggyLine : null,
  );
  const [state, setState] = useState<"idle" | "wrong" | "right">(
    alreadyDone ? "right" : "idle",
  );

  const lines = code.replace(/\n$/, "").split("\n");

  function check() {
    if (selected === buggyLine) {
      setState("right");
      markQuizCompleted(lessonId, quizId);
      onSolved();
    } else {
      setState("wrong");
    }
  }

  return (
    <div className="rounded-[24px] border border-white/10 bg-zinc-950/80 p-4">
      <div className="mb-3 text-sm font-semibold text-zinc-100">
        {t(`lessons.${lessonId}.quizzes.${quizId}.question`)}
      </div>
      <pre className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] font-mono text-sm text-zinc-100">
        {lines.map((line, i) => {
          const lineNum = i + 1;
          const isSelected = selected === lineNum;
          return (
            <button
              key={i}
              type="button"
              disabled={alreadyDone}
              onClick={() => setSelected(lineNum)}
              className={`flex w-full text-left px-3 py-0.5 ${
                isSelected
                  ? "bg-orange-500/12 ring-1 ring-orange-400/60"
                  : "hover:bg-white/[0.06]"
              } ${alreadyDone ? "cursor-default" : "cursor-pointer"}`}
            >
              <span className="w-8 shrink-0 select-none text-zinc-500">{lineNum}</span>
              <span className="whitespace-pre">{line || " "}</span>
            </button>
          );
        })}
      </pre>
      <div className="flex items-center gap-3 mt-3">
        {!alreadyDone && (
          <button
            onClick={check}
            disabled={selected === null}
            className="rounded-2xl bg-orange-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-orange-400 disabled:bg-zinc-700"
          >
            {t("ui.check")}
          </button>
        )}
        {state === "right" && (
          <span className="text-sm font-medium text-emerald-300">
            ✓ {t("ui.correct")}
          </span>
        )}
        {state === "wrong" && (
          <span className="text-sm font-medium text-red-300">
            ✗ {t("ui.tryAgain")}
          </span>
        )}
      </div>
    </div>
  );
}
