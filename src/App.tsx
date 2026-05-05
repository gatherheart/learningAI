import { useEffect, useState, startTransition } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import type { Lesson as LessonT } from "@/types";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { Lesson } from "@/components/Lesson";
import { Home } from "@/components/Home";
import { Interview } from "@/components/Interview";

export function App() {
  const [lessons, setLessons] = useState<LessonT[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;

    fetch("/lessons.json")
      .then((response) => response.json())
      .then((data: LessonT[]) => {
        if (!active) return;
        startTransition(() => {
          setLessons(data);
          setLoaded(true);
        });
      })
      .catch(() => {
        if (!active) return;
        startTransition(() => {
          setLessons([]);
          setLoaded(true);
        });
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-full px-3 py-3 text-zinc-100 sm:px-4 lg:px-5">
      <div className="app-panel flex min-h-[calc(100vh-1.5rem)] flex-col overflow-hidden">
        <Header lessons={lessons} />
        <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
          <Sidebar lessons={lessons} />
          {loaded ? (
            <Routes>
              <Route path="/" element={<Home lessons={lessons} />} />
              <Route path="/interview" element={<Interview />} />
              <Route path="/lesson/:id" element={<Lesson lessons={lessons} />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          ) : (
            <main className="flex flex-1 items-center justify-center bg-[radial-gradient(circle_at_top_right,rgba(251,146,60,0.16),transparent_24%),linear-gradient(180deg,rgba(9,9,11,0.86),rgba(9,9,11,0.98))] px-8 text-zinc-300">
              Loading the full curriculum...
            </main>
          )}
        </div>
      </div>
    </div>
  );
}
