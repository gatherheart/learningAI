import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { Lesson } from "@/types";
import { isLessonUnlocked } from "@/lib/store";

// Keyboard navigation between lessons:
//  - ArrowDown / j  → next unlocked lesson
//  - ArrowUp / k    → previous lesson
// No-op if focus is in an editable element so quiz inputs work normally.
export function useKeyboardNav(lessons: Lesson[], currentId: string | undefined) {
  const navigate = useNavigate();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target?.isContentEditable
      ) {
        return;
      }

      const idx = lessons.findIndex((l) => l.id === currentId);
      let next: number | null = null;

      if (e.key === "ArrowDown" || e.key === "j") {
        next = Math.min(lessons.length - 1, (idx === -1 ? -1 : idx) + 1);
      } else if (e.key === "ArrowUp" || e.key === "k") {
        next = Math.max(0, (idx === -1 ? lessons.length : idx) - 1);
      } else {
        return;
      }

      if (next !== null && next !== idx) {
        const target = lessons[next];
        if (target && isLessonUnlocked(next, lessons)) {
          e.preventDefault();
          navigate(`/lesson/${target.id}`);
        }
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lessons, currentId, navigate]);
}
