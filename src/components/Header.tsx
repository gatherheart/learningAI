import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { LOCALES } from "@/i18n";
import { getTheme, setTheme, type Theme } from "@/lib/theme";
import type { Lesson } from "@/types";
import { lessonProgress } from "@/lib/store";
import { useProgressVersion } from "@/lib/useProgressVersion";

interface Props {
  lessons: Lesson[];
}

export function Header({ lessons }: Props) {
  const { t, i18n } = useTranslation();
  const [theme, setLocal] = useState<Theme>(getTheme());
  useProgressVersion();
  const completed = lessons.filter((lesson) => lessonProgress(lesson.id, lesson.quizzes).done).length;
  const progress = lessons.length === 0 ? 0 : Math.round((completed / lessons.length) * 100);

  function cycle() {
    const next: Theme = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
    setLocal(next);
    setTheme(next);
  }

  const themeIcon = theme === "dark" ? "☾" : theme === "light" ? "☀" : "⌖";

  return (
    <header className="border-b border-white/10 bg-zinc-950/90">
      <div className="flex flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-6">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl border border-blue-400/50 bg-blue-500/15 text-lg font-bold text-blue-200 shadow-lg shadow-blue-950/40">A</span>
            <div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">model practice</div>
              <span className="text-lg font-semibold text-zinc-50">{t("ui.appName")}</span>
            </div>
          </Link>
          <div className="hidden items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 lg:flex">
            <div className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">{t("ui.progress")}</div>
            <div className="text-sm font-medium text-zinc-200">{completed}/{lessons.length} cleared</div>
            <div className="h-2 w-28 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-300 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-full border border-cyan-400/25 bg-cyan-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-cyan-200">
            {t("ui.learnByDoing")}
          </div>
          <button
            onClick={cycle}
            title={t("ui.theme") + ": " + theme}
            className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/5 text-base text-zinc-200 transition hover:border-blue-400/40 hover:bg-blue-500/10"
          >
            {themeIcon}
          </button>
          <select
            value={i18n.language}
            onChange={(event) => i18n.changeLanguage(event.target.value)}
            className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-100 outline-none transition hover:border-blue-400/40"
            aria-label="Language"
          >
            {LOCALES.map((locale) => (
              <option key={locale.code} value={locale.code}>
                {locale.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </header>
  );
}
