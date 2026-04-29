interface Props {
  content: string;
}

type Block =
  | { type: "paragraph"; text: string }
  | { type: "code"; code: string };

function parseBlocks(content: string): Block[] {
  const lines = content.split("\n");
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let code: string[] = [];
  let inCode = false;

  function flushParagraph() {
    const text = paragraph.join(" ").trim();
    if (text) blocks.push({ type: "paragraph", text });
    paragraph = [];
  }

  function flushCode() {
    const text = code.join("\n").trimEnd();
    if (text) blocks.push({ type: "code", code: text });
    code = [];
  }

  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      if (inCode) {
        flushCode();
      } else {
        flushParagraph();
      }
      inCode = !inCode;
      continue;
    }

    if (inCode) {
      code.push(line);
      continue;
    }

    if (line.trim() === "") {
      flushParagraph();
      continue;
    }

    paragraph.push(line.trim());
  }

  if (inCode) flushCode();
  flushParagraph();

  return blocks;
}

function renderInlineCode(text: string) {
  const parts = text.split(/(`[^`]+`)/g);

  return parts.map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={`${part}-${index}`}
          className="rounded-md bg-white/6 px-1.5 py-0.5 text-[0.95em] text-orange-100"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    return <span key={`${part}-${index}`}>{part}</span>;
  });
}

export function LessonDescription({ content }: Props) {
  const blocks = parseBlocks(content);

  return (
    <div className="mt-4 max-w-3xl space-y-4 text-base leading-8 text-zinc-300">
      {blocks.map((block, index) => {
        if (block.type === "code") {
          return (
            <pre
              key={index}
              className="overflow-x-auto rounded-2xl border border-white/10 bg-[#0d1117] px-4 py-3 font-mono text-sm leading-7 text-zinc-100"
            >
              <code>{block.code}</code>
            </pre>
          );
        }

        return <p key={index}>{renderInlineCode(block.text)}</p>;
      })}
    </div>
  );
}
