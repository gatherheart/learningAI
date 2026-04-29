import { useState } from "react";
import { useTranslation } from "react-i18next";
import { isQuizCompleted, markQuizCompleted } from "@/lib/store";

interface Props {
  lessonId: string;
  quizId: string;
  template: string;
  blanks: string[];
  onSolved: () => void;
}

export function FillInBlank({ lessonId, quizId, template, blanks, onSolved }: Props) {
  const { t } = useTranslation();
  const alreadyDone = isQuizCompleted(lessonId, quizId);
  const segments = template.split("___");
  const [values, setValues] = useState<string[]>(() =>
    alreadyDone ? blanks.slice() : blanks.map(() => ""),
  );
  const [state, setState] = useState<"idle" | "wrong" | "right">(
    alreadyDone ? "right" : "idle",
  );

  function check() {
    const ok = values.every((v, i) => v.trim() === blanks[i]);
    if (ok) {
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
      <pre className="whitespace-pre-wrap rounded-2xl border border-white/10 bg-white/[0.04] p-3 font-mono text-sm leading-6 text-zinc-100">
        {segments.map((seg, i) => (
          <span key={i}>
            {seg}
            {i < blanks.length && (
              <input
                value={values[i]}
                onChange={(e) =>
                  setValues((vs) => vs.map((v, j) => (j === i ? e.target.value : v)))
                }
                readOnly={alreadyDone}
                size={Math.max(blanks[i].length + 2, 4)}
                className="mx-0.5 inline-block border-b-2 border-orange-400 bg-orange-500/10 px-1 font-mono text-zinc-100 focus:bg-zinc-900 focus:outline-none"
              />
            )}
          </span>
        ))}
      </pre>
      <div className="flex items-center gap-3 mt-3">
        {!alreadyDone && (
          <button
            onClick={check}
            className="rounded-2xl bg-orange-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-orange-400"
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
