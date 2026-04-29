import { useState } from "react";
import { useTranslation } from "react-i18next";
import { isQuizCompleted, markQuizCompleted } from "@/lib/store";

interface Props {
  lessonId: string;
  quizId: string;
  expectedOutput: string;
  onSolved: () => void;
}

function normalize(s: string) {
  return s.replace(/\r\n/g, "\n").trimEnd();
}

export function PredictOutput({ lessonId, quizId, expectedOutput, onSolved }: Props) {
  const { t } = useTranslation();
  const alreadyDone = isQuizCompleted(lessonId, quizId);
  const [value, setValue] = useState("");
  const [state, setState] = useState<"idle" | "wrong" | "right">(
    alreadyDone ? "right" : "idle",
  );

  function check() {
    if (normalize(value) === normalize(expectedOutput)) {
      setState("right");
      markQuizCompleted(lessonId, quizId);
      onSolved();
    } else {
      setState("wrong");
    }
  }

  return (
    <div className="rounded-[24px] border border-white/10 bg-zinc-950/80 p-4">
      <div className="mb-2 text-sm font-semibold text-zinc-100">
        {t(`lessons.${lessonId}.quizzes.${quizId}.question`)}
      </div>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        readOnly={alreadyDone}
        rows={Math.max(3, expectedOutput.split("\n").length)}
        className="w-full rounded-2xl border border-white/10 bg-white/[0.04] p-3 font-mono text-sm text-zinc-100 outline-none focus:border-orange-400/45"
        placeholder={t("ui.predictPlaceholder") ?? ""}
      />
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
