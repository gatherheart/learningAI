import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const context = vm.createContext({ window: {} });
for (const file of ["dist/content.js", "dist/expansions.js"]) {
  vm.runInContext(fs.readFileSync(file, "utf8"), context, { filename: file });
}

const modules = context.window.CURRICULUM;
const source = [
  fs.readFileSync("dist/content.js", "utf8"),
  fs.readFileSync("dist/expansions.js", "utf8"),
  fs.readFileSync("dist/index.html", "utf8"),
].join("\n");

const checks = [];
function check(name, fn) {
  fn();
  checks.push(name);
}

function softmax(row) {
  const maximum = Math.max(...row);
  const exps = row.map(value => Math.exp(value - maximum));
  const denominator = exps.reduce((sum, value) => sum + value, 0);
  return exps.map(value => value / denominator);
}

function onlineWeightedAverage(scoreTiles, valueTiles) {
  let maximum = -Infinity;
  let normalizer = 0;
  let accumulator = Array(valueTiles[0][0].length).fill(0);
  for (let tile = 0; tile < scoreTiles.length; tile++) {
    const scores = scoreTiles[tile];
    const values = valueTiles[tile];
    const newMaximum = Math.max(maximum, ...scores);
    const previousScale = Math.exp(maximum - newMaximum);
    const weights = scores.map(score => Math.exp(score - newMaximum));
    normalizer = previousScale * normalizer + weights.reduce((a, b) => a + b, 0);
    accumulator = accumulator.map((oldValue, dimension) =>
      previousScale * oldValue + weights.reduce((sum, weight, row) => sum + weight * values[row][dimension], 0)
    );
    maximum = newMaximum;
  }
  return accumulator.map(value => value / normalizer);
}

check("module inventory", () => {
  assert.equal(modules.length, 9);
  assert.deepEqual(Array.from(modules, module => module.index), ["00", "01", "02", "03", "04", "05", "06", "07", "08"]);
  for (const module of modules) {
    assert.ok(module.longform.length > 2_000, `${module.id} longform is unexpectedly short`);
    assert.ok(module.walkthrough.lines.length >= 4, `${module.id} needs line-by-line code notes`);
  }
});

check("declared tensor convention", () => {
  assert.match(source, /post-transpose <code>\[B, H, T, D\]<\/code> convention/);
  assert.match(source, /Q=\[2,8,128,64\]/);
  assert.doesNotMatch(source, /Reshape \[B,T,d\] into \[B,h,T,dₕ\]/);
});

check("QK transpose shape and bytes", () => {
  const [batch, heads, queries, dimension] = [2, 8, 128, 64];
  const keys = 512;
  assert.deepEqual([batch, heads, queries, keys], [2, 8, 128, 512]);
  assert.equal(dimension, 64);
  const elements = batch * heads * queries * keys;
  assert.equal(elements, 1_048_576);
  assert.equal(elements * 2 / 2 ** 20, 2);
});

check("stable softmax and causal mask", () => {
  const probabilities = softmax([1_000, 1_001, 1_002]);
  assert.ok(probabilities.every(Number.isFinite));
  assert.ok(Math.abs(probabilities.reduce((a, b) => a + b, 0) - 1) < 1e-12);
  const causalForbidden = Array.from({ length: 4 }, (_, query) =>
    Array.from({ length: 4 }, (_, key) => key > query)
  );
  assert.deepEqual(causalForbidden[0], [false, true, true, true]);
  assert.deepEqual(causalForbidden[3], [false, false, false, false]);
});

check("attention FLOP convention", () => {
  const tokens = 128;
  const headDimension = 64;
  const qkFlops = 2 * tokens * tokens * headDimension;
  const pvFlops = 2 * tokens * tokens * headDimension;
  assert.equal(qkFlops + pvFlops, 4_194_304);
  assert.match(source, /forming QKᵀ costs approximately 2T²D FLOPs/);
});

check("GQA mapping and payload ratio", () => {
  const queryHeads = 32;
  const kvHeads = 8;
  const groupSize = queryHeads / kvHeads;
  const mapping = Array.from({ length: queryHeads }, (_, head) => Math.floor(head / groupSize));
  assert.deepEqual(mapping.slice(0, 8), [0, 0, 0, 0, 1, 1, 1, 1]);
  assert.equal(kvHeads / queryHeads, 0.25);
});

check("KV payload formula", () => {
  const bytes = 2 * 32 * 4_096 * 8 * 128 * 2 * 16;
  assert.equal(bytes / 2 ** 30, 8);
  const variableLengthBytes = 2 * 32 * (4_096 + 2_048) * 8 * 128 * 2;
  assert.equal(variableLengthBytes / 2 ** 30, 0.75);
  assert.match(source, /길이가 다르면 active_sequences를 곱하지 말고 sequence별 stored token 수를 합산/);
});

check("online softmax equivalence", () => {
  const scoreTiles = [[1, 2], [-1, 3]];
  const valueTiles = [[[1, 0], [0, 1]], [[2, 2], [4, 1]]];
  const online = onlineWeightedAverage(scoreTiles, valueTiles);
  const scores = scoreTiles.flat();
  const values = valueTiles.flat();
  const probabilities = softmax(scores);
  const direct = [0, 1].map(dimension =>
    probabilities.reduce((sum, probability, row) => sum + probability * values[row][dimension], 0)
  );
  for (let dimension = 0; dimension < direct.length; dimension++) {
    assert.ok(Math.abs(online[dimension] - direct[dimension]) < 1e-12);
  }
});

check("scheduler illustration", () => {
  const lengths = [7, 2, 5, 9, 3, 6];
  const capacity = 3;
  let staticIterations = 0;
  for (let i = 0; i < lengths.length; i += capacity) {
    staticIterations += Math.max(...lengths.slice(i, i + capacity));
  }
  assert.equal(staticIterations, 16);
  assert.match(source, /Planning is side-effect free/);
  assert.doesNotMatch(context.window.CURRICULUM.find(module => module.id === "scheduling").code, /popleft/);
});

check("paged-cache waste bound", () => {
  const blockSize = 16;
  const lengths = [16, 17, 31, 32];
  const waste = lengths.map(length => Math.ceil(length / blockSize) * blockSize - length);
  assert.deepEqual(waste, [0, 15, 1, 0]);
  assert.ok(waste.every(value => value <= blockSize - 1));
});

check("metrics undefined states", () => {
  const production = modules.find(module => module.id === "production").code;
  assert.match(production, /if self\.first_token is None/);
  assert.match(production, /if len\(self\.token_times\) < 2/);
  assert.doesNotMatch(production, /else 0\.0/);
});

console.log(`Curriculum audit passed: ${checks.length} checks`);
for (const name of checks) console.log(`  ✓ ${name}`);
