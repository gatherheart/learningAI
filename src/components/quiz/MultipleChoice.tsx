import { useState } from "react";
import { useTranslation } from "react-i18next";
import { isQuizCompleted, markQuizCompleted } from "@/lib/store";

interface Props {
  lessonId: string;
  quizId: string;
  question: string;
  options: string[];
  explanations: string[];
  answer: number;
  answerReason?: string;
  onSolved: () => void;
}

export function MultipleChoice({
  lessonId,
  quizId,
  question,
  options,
  explanations,
  answer,
  answerReason = "",
  onSolved,
}: Props) {
  const { t } = useTranslation();
  const alreadyDone = isQuizCompleted(lessonId, quizId);
  const [selected, setSelected] = useState<number | null>(alreadyDone ? answer : null);
  const [state, setState] = useState<"idle" | "wrong" | "right">(
    alreadyDone ? "right" : "idle",
  );
  const wrongReason =
    selected !== null && explanations[selected]
      ? explanations[selected]
      : t("ui.incorrectReasonFallback");

  function check() {
    if (selected === answer) {
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
        {question}
      </div>
      <div className="space-y-2">
        {Array.isArray(options) &&
          options.map((opt, i) => (
            <label
              key={i}
              className={`flex items-start gap-2 p-2 rounded border cursor-pointer text-sm ${
                selected === i
                  ? "border-blue-400/60 bg-blue-500/10"
                  : "border-white/10 bg-white/[0.03] hover:border-blue-400/30"
              } ${alreadyDone ? "cursor-default" : ""}`}
            >
              <input
                type="radio"
                name={`${lessonId}-${quizId}`}
                checked={selected === i}
                disabled={alreadyDone}
                onChange={() => setSelected(i)}
                className="mt-0.5"
              />
              <span className="font-mono whitespace-pre-wrap text-zinc-100">
                {opt}
              </span>
            </label>
          ))}
      </div>
      <div className="flex items-center gap-3 mt-3">
        {!alreadyDone && (
          <button
            onClick={check}
            disabled={selected === null}
            className="rounded-2xl bg-blue-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-400 disabled:bg-zinc-700"
          >
            {t("ui.check")}
          </button>
        )}
        {state === "right" && (
          <span className="text-sm font-medium text-cyan-300">
            ✓ {t("ui.correct")}
          </span>
        )}
        {state === "wrong" && (
          <div className="space-y-2 rounded-2xl border border-indigo-400/25 bg-indigo-500/10 px-4 py-3 text-sm text-indigo-100">
            <div className="font-medium">✗ {t("ui.tryAgain")}</div>
            <div>{wrongReason}</div>
            {answerReason && <div className="text-indigo-100/90">{answerReason}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
