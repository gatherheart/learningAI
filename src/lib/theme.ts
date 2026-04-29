// Tiny theme controller: light / dark / system, persisted to localStorage,
// applied as the `dark` class on <html> so Tailwind's darkMode:'class' picks
// it up. Listens to system preference changes when mode is "system".

export type Theme = "light" | "dark" | "system";
const KEY = "learningrust:theme";

function systemPrefersDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function effective(theme: Theme): "light" | "dark" {
  if (theme === "system") return systemPrefersDark() ? "dark" : "light";
  return theme;
}

function apply(theme: Theme) {
  const eff = effective(theme);
  document.documentElement.classList.toggle("dark", eff === "dark");
}

export function getTheme(): Theme {
  return (localStorage.getItem(KEY) as Theme | null) ?? "system";
}

export function setTheme(theme: Theme) {
  localStorage.setItem(KEY, theme);
  apply(theme);
}

export function initTheme() {
  apply(getTheme());
  // Re-apply when system pref changes if user is on "system" mode.
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", () => {
    if (getTheme() === "system") apply("system");
  });
}
