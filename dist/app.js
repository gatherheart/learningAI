const curriculum = window.CURRICULUM;
const completed = new Set(JSON.parse(localStorage.getItem("ia-completed") || "[]"));

const nav = document.querySelector("#module-nav");
const list = document.querySelector("#module-list");

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
}

function renderModules() {
  nav.innerHTML = curriculum.map(m => `<a href="#${m.id}"><span>${m.index}</span>${m.title}</a>`).join("");
  list.innerHTML = curriculum.map(m => `
    <article class="module ${completed.has(m.id) ? "complete" : ""}" id="${m.id}">
      <button class="module-summary" aria-expanded="false" aria-controls="detail-${m.id}">
        <span class="module-index">${m.index}</span>
        <span class="module-title"><strong>${m.title}</strong><small>${m.summary}</small></span>
        <span class="module-duration">${m.duration}</span>
        <span class="module-plus">+</span>
      </button>
      <div class="module-detail" id="detail-${m.id}">
        <div class="concept-row">${m.concepts.map(c => `<span>${c}</span>`).join("")}</div>
        <div class="detail-columns">
          <div class="prose">${m.detail}</div>
          <div>
            <div class="code-head"><span>Reference implementation</span><button data-copy="${m.id}">Copy</button></div>
            <pre class="code"><code id="code-${m.id}">${escapeHtml(m.code)}</code></pre>
            <div class="falsify"><b>Mastery check</b><p>${m.check}</p></div>
            <label class="complete-toggle"><input type="checkbox" data-complete="${m.id}" ${completed.has(m.id) ? "checked" : ""}> Mark module complete</label>
          </div>
        </div>
      </div>
    </article>`).join("");
  updateProgress();
}

function updateProgress() {
  document.querySelector("#progress-label").textContent = `${completed.size} / ${curriculum.length} modules`;
}

list.addEventListener("click", event => {
  const summary = event.target.closest(".module-summary");
  if (summary) {
    const article = summary.closest(".module");
    const open = article.classList.toggle("open");
    summary.setAttribute("aria-expanded", String(open));
  }
  const copy = event.target.closest("[data-copy]");
  if (copy) {
    navigator.clipboard.writeText(document.querySelector(`#code-${copy.dataset.copy}`).textContent);
    copy.textContent = "Copied";
    setTimeout(() => copy.textContent = "Copy", 1200);
  }
});

list.addEventListener("change", event => {
  if (!event.target.matches("[data-complete]")) return;
  const id = event.target.dataset.complete;
  event.target.checked ? completed.add(id) : completed.delete(id);
  localStorage.setItem("ia-completed", JSON.stringify([...completed]));
  event.target.closest(".module").classList.toggle("complete", event.target.checked);
  updateProgress();
});

function parseMatrix(text) {
  const rows = text.split(";").map(row => row.split(",").map(Number));
  if (rows.length !== 2 || rows.some(r => r.length !== 2 || r.some(Number.isNaN))) throw new Error("Use a 2 × 2 matrix.");
  return rows;
}

const transpose = a => a[0].map((_, j) => a.map(row => row[j]));
const matmul = (a, b) => a.map(row => transpose(b).map(col => row.reduce((s, x, i) => s + x * col[i], 0)));
const formatMatrix = m => m.map(row => `[ ${row.map(x => Number.isFinite(x) ? x.toFixed(3) : "−∞").join("  ")} ]`).join("\n");

function runAttention() {
  try {
    const q = parseMatrix(document.querySelector("#q-input").value);
    const k = parseMatrix(document.querySelector("#k-input").value);
    const v = parseMatrix(document.querySelector("#v-input").value);
    const scores = matmul(q, transpose(k)).map(row => row.map(x => x / Math.sqrt(2)));
    if (document.querySelector("#causal-input").checked) scores[0][1] = -Infinity;
    const weights = scores.map(row => {
      const max = Math.max(...row);
      const e = row.map(x => Math.exp(x - max));
      const total = e.reduce((a, b) => a + b, 0);
      return e.map(x => x / total);
    });
    document.querySelector("#score-output").textContent = formatMatrix(scores);
    document.querySelector("#weight-output").textContent = formatMatrix(weights);
    document.querySelector("#attention-output").textContent = formatMatrix(matmul(weights, v));
  } catch (error) {
    document.querySelector("#attention-output").textContent = error.message;
  }
}

document.querySelector("#run-attention").addEventListener("click", runAttention);

const rangeIds = ["layers", "heads", "dim", "seq", "batch"];
function updateMemory() {
  rangeIds.forEach(id => document.querySelector(`#${id}-value`).textContent = Number(document.querySelector(`#${id}`).value).toLocaleString());
  const values = Object.fromEntries(rangeIds.map(id => [id, Number(document.querySelector(`#${id}`).value)]));
  const bytes = Number(document.querySelector("#bytes").value);
  const total = 2 * values.layers * values.seq * values.heads * values.dim * bytes * values.batch;
  const units = total >= 2 ** 40 ? [2 ** 40, "TiB"] : total >= 2 ** 30 ? [2 ** 30, "GiB"] : [2 ** 20, "MiB"];
  document.querySelector("#memory-total").textContent = `${(total / units[0]).toFixed(2)} ${units[1]}`;
  document.querySelector("#memory-equation").textContent = `2 × ${values.layers} layers × ${values.seq.toLocaleString()} tokens × ${values.heads} KV heads × ${values.dim} dim × ${bytes} bytes × ${values.batch} sequences`;
}
rangeIds.forEach(id => document.querySelector(`#${id}`).addEventListener("input", updateMemory));
document.querySelector("#bytes").addEventListener("change", updateMemory);

function staticSchedule(lengths, capacity) {
  let time = 0, slots = 0;
  for (let i = 0; i < lengths.length; i += capacity) {
    const batch = lengths.slice(i, i + capacity);
    time += Math.max(...batch);
    slots += Math.max(...batch) * capacity;
  }
  return { time, useful: lengths.reduce((a, b) => a + b, 0), slots };
}

function continuousSchedule(lengths, capacity) {
  const queue = lengths.map((left, i) => ({ id: i, left }));
  let active = [], time = 0, slots = 0;
  const timeline = [];
  while (queue.length || active.length) {
    while (active.length < capacity && queue.length) active.push(queue.shift());
    timeline.push(active.map(r => `R${r.id + 1}`));
    active.forEach(r => r.left--);
    active = active.filter(r => r.left > 0);
    time++; slots += capacity;
  }
  return { time, useful: lengths.reduce((a, b) => a + b, 0), slots, timeline };
}

function runScheduler() {
  const lengths = document.querySelector("#requests").value.split(",").map(x => Number(x.trim())).filter(x => Number.isInteger(x) && x > 0);
  const capacity = Number(document.querySelector("#capacity").value);
  if (!lengths.length || !Number.isInteger(capacity) || capacity < 1) return;
  const stat = staticSchedule(lengths, capacity);
  const cont = continuousSchedule(lengths, capacity);
  const utilization = x => `${(100 * x.useful / x.slots).toFixed(1)}%`;
  document.querySelector("#scheduler-results").innerHTML = `
    <article><span>Static batching</span><strong>${stat.time} iterations</strong><small>${utilization(stat)} slot utilization</small></article>
    <article><span>Continuous batching</span><strong>${cont.time} iterations</strong><small>${utilization(cont)} slot utilization</small></article>
    <div class="timeline"><span>Continuous timeline</span>${cont.timeline.map((row, i) => `<div><b>${i + 1}</b>${row.map(x => `<i>${x}</i>`).join("")}</div>`).join("")}</div>`;
}
document.querySelector("#run-scheduler").addEventListener("click", runScheduler);

const themeButton = document.querySelector("#theme-toggle");
const storedTheme = localStorage.getItem("ia-theme");
if (storedTheme) document.documentElement.dataset.theme = storedTheme;
themeButton.addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
  document.documentElement.dataset.theme = next;
  localStorage.setItem("ia-theme", next);
});

renderModules();
runAttention();
updateMemory();
runScheduler();
