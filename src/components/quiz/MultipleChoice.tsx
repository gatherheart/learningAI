import { useState } from "react";
import { useTranslation } from "react-i18next";
import { isQuizCompleted, markQuizCompleted } from "@/lib/store";

interface Props {
  lessonId: string;
  quizId: string;
  answer: number;
  onSolved: () => void;
}

export function MultipleChoice({ lessonId, quizId, answer, onSolved }: Props) {
  const { t } = useTranslation();
  const alreadyDone = isQuizCompleted(lessonId, quizId);
  const [selected, setSelected] = useState<number | null>(alreadyDone ? answer : null);
  const [state, setState] = useState<"idle" | "wrong" | "right">(
    alreadyDone ? "right" : "idle",
  );

  const options = t(`lessons.${lessonId}.quizzes.${quizId}.options`, {
    returnObjects: true,
  }) as string[];
  const rawExplanations = t(`lessons.${lessonId}.quizzes.${quizId}.explanations`, {
    returnObjects: true,
  });
  const explanations = Array.isArray(rawExplanations) ? (rawExplanations as string[]) : [];
  const answerReasonKey = `lessons.${lessonId}.quizzes.${quizId}.answerReason`;
  const answerReasonValue = t(answerReasonKey);
  const answerReason = answerReasonValue === answerReasonKey ? "" : answerReasonValue;
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
        {t(`lessons.${lessonId}.quizzes.${quizId}.question`)}
      </div>
      <div className="space-y-2">
        {Array.isArray(options) &&
          options.map((opt, i) => (
            <label
              key={i}
              className={`flex items-start gap-2 p-2 rounded border cursor-pointer text-sm ${
                selected === i
                  ? "border-orange-400/60 bg-orange-500/10"
                  : "border-white/10 bg-white/[0.03] hover:border-orange-400/30"
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
          <div className="space-y-2 rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            <div className="font-medium">✗ {t("ui.tryAgain")}</div>
            <div>{wrongReason}</div>
            {answerReason && <div className="text-red-100/90">{answerReason}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
