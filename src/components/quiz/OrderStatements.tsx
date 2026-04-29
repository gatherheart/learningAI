import { useState } from "react";
import { useTranslation } from "react-i18next";
import { isQuizCompleted, markQuizCompleted } from "@/lib/store";

interface Props {
  lessonId: string;
  quizId: string;
  answer: number[];
  onSolved: () => void;
}

export function OrderStatements({ lessonId, quizId, answer, onSolved }: Props) {
  const { t } = useTranslation();
  const alreadyDone = isQuizCompleted(lessonId, quizId);

  const items = t(`lessons.${lessonId}.quizzes.${quizId}.options`, {
    returnObjects: true,
  }) as string[];

  const [order, setOrder] = useState<number[]>(alreadyDone ? answer.slice() : []);
  const [state, setState] = useState<"idle" | "wrong" | "right">(
    alreadyDone ? "right" : "idle",
  );

  function pick(idx: number) {
    if (alreadyDone) return;
    if (order.includes(idx)) return;
    setOrder([...order, idx]);
  }

  function remove(idx: number) {
    if (alreadyDone) return;
    setOrder(order.filter((i) => i !== idx));
  }

  function check() {
    const ok =
      order.length === answer.length && order.every((v, i) => v === answer[i]);
    if (ok) {
      setState("right");
      markQuizCompleted(lessonId, quizId);
      onSolved();
    } else {
      setState("wrong");
    }
  }

  if (!Array.isArray(items)) return null;

  return (
    <div className="rounded-[24px] border border-white/10 bg-zinc-950/80 p-4">
      <div className="mb-3 text-sm font-semibold text-zinc-100">
        {t(`lessons.${lessonId}.quizzes.${quizId}.question`)}
      </div>

      <div className="mb-2 text-xs uppercase tracking-wide text-zinc-500">
        {t("ui.yourOrder")}
      </div>
      <ol className="mb-3 min-h-[2.5rem] space-y-1.5 rounded-2xl border border-dashed border-white/15 p-2">
        {order.length === 0 && (
          <li className="text-sm italic text-zinc-500">{t("ui.tapItemsBelow")}</li>
        )}
        {order.map((itemIdx, pos) => (
          <li key={`${itemIdx}-${pos}`}>
            <button
              type="button"
              onClick={() => remove(itemIdx)}
              disabled={alreadyDone}
              className="flex w-full items-start gap-2 rounded-2xl border border-orange-400/25 bg-orange-500/10 px-3 py-1.5 text-left font-mono text-sm text-zinc-100"
            >
              <span className="w-6 shrink-0 font-semibold text-orange-200">
                {pos + 1}.
              </span>
              <span className="flex-1">{items[itemIdx]}</span>
              {!alreadyDone && <span className="text-xs text-zinc-500">×</span>}
            </button>
          </li>
        ))}
      </ol>

      <div className="mb-2 text-xs uppercase tracking-wide text-zinc-500">
        {t("ui.available")}
      </div>
      <div className="space-y-1.5">
        {items.map((label, i) => {
          const used = order.includes(i);
          return (
            <button
              key={i}
              type="button"
              onClick={() => pick(i)}
              disabled={used || alreadyDone}
              className={`w-full text-left px-3 py-1.5 rounded border text-sm font-mono ${
                used
                  ? "border-white/10 bg-white/[0.04] text-zinc-600"
                  : "border-white/10 bg-white/[0.03] text-zinc-100 hover:border-orange-400/40 hover:bg-orange-500/10"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3 mt-4">
        {!alreadyDone && (
          <button
            onClick={check}
            disabled={order.length !== items.length}
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
