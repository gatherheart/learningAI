import { useEffect, useRef, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { EditorState } from "@codemirror/state";
import { indentUnit } from "@codemirror/language";
import { useTranslation } from "react-i18next";
import { playgroundUrl } from "@/lib/playground";

interface Props {
  code: string;
  expectedOutput: string;
}

function isDark() {
  return document.documentElement.classList.contains("dark");
}

export function CodeBlock({ code }: Props) {
  const { t } = useTranslation();
  const [dark, setDark] = useState(isDark());
  const [draft, setDraft] = useState(code);
  const initialCodeRef = useRef(code);

  useEffect(() => {
    const obs = new MutationObserver(() => setDark(isDark()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    initialCodeRef.current = code;
    setDraft(code);
  }, [code]);

  function resetCode() {
    setDraft(initialCodeRef.current);
  }

  return (
    <div className="overflow-hidden rounded-[30px] border border-white/10 bg-[#0d1117] shadow-2xl shadow-black/20">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-zinc-950/90 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex gap-2"><span className="h-3 w-3 rounded-full bg-red-400/80" /><span className="h-3 w-3 rounded-full bg-amber-300/80" /><span className="h-3 w-3 rounded-full bg-emerald-400/80" /></div>
          <span className="font-mono text-xs uppercase tracking-[0.28em] text-zinc-500">{t("ui.workspaceFile")}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={resetCode} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-zinc-200 transition hover:border-white/20 hover:bg-white/10">{t("ui.resetCode")}</button>
          <a href={playgroundUrl(draft)} target="_blank" rel="noreferrer" className="rounded-full border border-orange-400/25 bg-orange-500/10 px-3 py-1 text-xs font-medium text-orange-100 transition hover:border-orange-300/45 hover:bg-orange-500/15">{t("ui.openWorkspace")} ↗</a>
        </div>
      </div>
      <div className="border-b border-white/10 bg-orange-500/8 px-4 py-2 text-xs text-orange-100">{t("ui.workspaceNote")}</div>
      <CodeMirror
        value={draft}
        extensions={[EditorState.tabSize.of(4), indentUnit.of("    ")]}
        editable
        onChange={setDraft}
        basicSetup={{ lineNumbers: true, foldGutter: false, highlightActiveLine: false }}
        theme={dark ? "dark" : "light"}
      />
    </div>
  );
}
