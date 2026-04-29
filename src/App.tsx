import { Navigate, Route, Routes } from "react-router-dom";
import lessonsData from "@/data/lessons.json";
import type { Lesson as LessonT } from "@/types";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { Lesson } from "@/components/Lesson";
import { Home } from "@/components/Home";

const lessons = lessonsData as LessonT[];

export function App() {
  return (
    <div className="min-h-full px-3 py-3 text-zinc-100 sm:px-4 lg:px-5">
      <div className="app-panel flex min-h-[calc(100vh-1.5rem)] flex-col overflow-hidden">
        <Header lessons={lessons} />
        <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
          <Sidebar lessons={lessons} />
          <Routes>
            <Route path="/" element={<Home lessons={lessons} />} />
            <Route path="/lesson/:id" element={<Lesson lessons={lessons} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}
