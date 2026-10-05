window.CURRICULUM = [
  {
    id: "foundations", index: "00", title: "Systems and tensor foundations", duration: "1–2 weeks",
    summary: "Build the vocabulary needed to reason about numerical kernels, GPU execution, and serving objectives without hand-waving.",
    concepts: ["Tensor shape and stride", "Floating-point formats", "GPU memory hierarchy", "Arithmetic intensity", "Latency, throughput, utilization, and goodput"],
    detail: `<h4>What you must understand</h4><p>A tensor is a view over storage: shape describes logical axes, strides map an index to an address, and dtype sets both range and bytes. A transpose is often a metadata operation until a kernel requires contiguous storage. On a GPU, performance depends on whether work is compute-bound or memory-bound—not merely on operation count.</p><p>Use the roofline model: attainable FLOP/s is bounded by min(peak compute, memory bandwidth × arithmetic intensity). Decode-phase attention usually has low arithmetic intensity because each new token reads a large KV cache while performing relatively little reuse.</p><h4>Deliverable</h4><p>Write a tensor inspection utility that reports shape, stride, dtype, storage bytes, contiguity, and device. Benchmark matrix multiplication across sizes and explain the curve.</p>`,
    longform: `<div class="course-intro">
      <div><span>10 study days</span><strong>18–25 hours</strong><small>Theory 7h · implementation 9h · experiments 6h · report 3h</small></div>
      <p><b>Exit criterion.</b> You can inspect an unfamiliar tensor operation, predict its allocation and data movement, measure it correctly on a GPU, and explain whether its bottleneck is compute, memory bandwidth, launch overhead, or synchronization.</p>
    </div>
    <div class="study-plan">
      <h3>Two-week study plan</h3>
      <div class="day-grid">
        <article><span>Day 01</span><b>Tensor algebra</b><p>Shapes, axes, broadcasting, reductions, batched matrix multiplication.</p></article>
        <article><span>Day 02</span><b>Storage model</b><p>Storage, offset, strides, views, transpose, reshape, contiguity.</p></article>
        <article><span>Day 03</span><b>Numerical formats</b><p>FP32, FP16, BF16, rounding, range, mixed precision.</p></article>
        <article><span>Day 04</span><b>GPU execution</b><p>Threads, warps, blocks, SMs, synchronization, occupancy.</p></article>
        <article><span>Day 05</span><b>Memory hierarchy</b><p>Registers, shared memory, caches, HBM, coalescing.</p></article>
        <article><span>Day 06</span><b>Performance model</b><p>FLOPs, bandwidth, arithmetic intensity, roofline analysis.</p></article>
        <article><span>Day 07</span><b>Benchmarking</b><p>Warm-up, synchronization, percentiles, profiler traces.</p></article>
        <article><span>Day 08</span><b>Serving metrics</b><p>TTFT, TPOT, TPS, goodput, queueing, tail latency.</p></article>
        <article><span>Day 09</span><b>Integrated lab</b><p>Tensor inspector and GEMM/elementwise benchmark suite.</p></article>
        <article><span>Day 10</span><b>Technical report</b><p>Explain observations, threats to validity, and conclusions.</p></article>
      </div>
    </div>
    <section class="lesson">
      <div class="lesson-number">00.1</div><div><h3>Tensor algebra: reason with shapes first</h3>
      <p>A scalar has no axis, a vector has one, a matrix has two, and a tensor generalizes this to any rank. In serving code, axis meaning matters more than rank. Before splitting into heads, a projection is commonly reshaped to <code>[B, T, H, D]</code>. Attention implementations then transpose it to <code>[B, H, T, D]</code> so that every head owns a <code>[T, D]</code> matrix. The shape drill below uses this post-transpose <code>[B, H, T, D]</code> convention. Always write the semantic name and convention of every axis before manipulating it.</p>
      <div class="equation">C[b, i, j] = Σ<sub>k</sub> A[b, i, k]B[b, k, j]</div>
      <p>For batched matrix multiplication, the contracted dimensions must agree. If A has shape <code>[B,M,K]</code> and B has <code>[B,K,N]</code>, the output is <code>[B,M,N]</code>. Leading dimensions can broadcast. Broadcasting does not necessarily copy data: a size-one axis can be represented with stride zero.</p>
      <h4>Shape drill</h4><ol><li>Using the <code>[B,H,T,D]</code> convention, let Q=[2,8,128,64] and K=[2,8,512,64]. Derive the shape of QKᵀ.</li><li>Explain why only the final feature axis D=64 is contracted and why the result stores 2×8×128×512 scores.</li><li>Compute the storage in MiB at FP16.</li></ol>
      <div class="answer"><b>Check:</b> the result is [2,8,128,512]. It contains 1,048,576 elements and occupies 2 MiB at two bytes per element.</div></div>
    </section>
    <section class="lesson">
      <div class="lesson-number">00.2</div><div><h3>Storage, stride, and views</h3>
      <p>A tensor index maps to storage using <code>address = offset + Σ index[i] × stride[i]</code>. A contiguous row-major [3,4] tensor has stride [4,1]. Its transpose has shape [4,3] and stride [1,4], usually sharing the same storage. No elements move until an operation demands a different layout.</p>
      <pre class="lesson-code"><code>import torch

x = torch.arange(24).reshape(2, 3, 4)
y = x.transpose(1, 2)
print(x.shape, x.stride(), x.data_ptr())
print(y.shape, y.stride(), y.data_ptr())
print(y.is_contiguous())
z = y.contiguous()
print(z.stride(), z.data_ptr() == y.data_ptr())

# A view is valid only when the requested dimensions are compatible
# with the current stride pattern.
try:
    y.view(2, 12)
except RuntimeError as error:
    print(type(error).__name__)
print(y.reshape(2, 12).is_contiguous())</code></pre>
      <p><code>reshape</code> may return a view or silently allocate a copy. Never infer its cost from the API name; compare storage pointers and profile allocations. <code>expand</code> uses stride-zero views, whereas <code>repeat</code> materializes copies.</p>
      <div class="task"><b>Lab A — Tensor inspector</b><p>Implement a function that prints shape, stride, storage offset, element size, allocated bytes, contiguity, pointer, device, and whether two tensors alias the same storage. Test slice, transpose, permute, expand, repeat, view, reshape, and contiguous.</p></div></div>
    </section>
    <section class="lesson">
      <div class="lesson-number">00.3</div><div><h3>Floating-point formats and error</h3>
      <p>A floating-point value is approximately sign × significand × 2<sup>exponent</sup>. More exponent bits increase dynamic range; more mantissa bits increase local precision. FP16 has greater precision than BF16 but far less range. BF16 shares FP32's eight exponent bits, which makes it robust for many neural-network activations.</p>
      <table><thead><tr><th>Format</th><th>Bits</th><th>Exponent</th><th>Fraction</th><th>Typical role</th></tr></thead><tbody><tr><td>FP32</td><td>32</td><td>8</td><td>23</td><td>Reference, accumulation, sensitive reductions</td></tr><tr><td>FP16</td><td>16</td><td>5</td><td>10</td><td>Dense compute with loss scaling</td></tr><tr><td>BF16</td><td>16</td><td>8</td><td>7</td><td>Training/inference with FP32-like range</td></tr><tr><td>FP8</td><td>8</td><td>variant</td><td>variant</td><td>Quantized compute/cache with scaling</td></tr><tr><td>INT8</td><td>8</td><td>—</td><td>—</td><td>Quantized weights/activations</td></tr></tbody></table>
      <pre class="lesson-code"><code>def relative_error(reference, candidate, eps=1e-12):
    return ((reference - candidate).abs() /
            reference.abs().clamp_min(eps))

torch.manual_seed(0)
a = torch.randn(1024, 1024, device="cuda")
b = torch.randn(1024, 1024, device="cuda")
ref = a.double() @ b.double()
for dtype in (torch.float32, torch.float16, torch.bfloat16):
    out = (a.to(dtype) @ b.to(dtype)).double()
    err = relative_error(ref, out)
    print(dtype, err.median().item(), err.quantile(.99).item())</code></pre>
      <p>Report both absolute and relative error distributions. Relative error is unstable near a zero reference, so use a floor and inspect absolute error too. For reductions, accumulation dtype may matter more than input dtype.</p></div>
    </section>
    <section class="lesson">
      <div class="lesson-number">00.4</div><div><h3>GPU execution and memory hierarchy</h3>
      <p>A kernel launches a grid of thread blocks. Blocks are assigned to streaming multiprocessors; threads execute in warps, commonly 32 lanes on NVIDIA GPUs. Divergent branches within a warp serialize paths. Occupancy describes resident warps relative to hardware capacity, but maximum occupancy is not automatically maximum performance.</p>
      <div class="memory-stack"><span><b>Registers</b> per thread · fastest · smallest</span><span><b>Shared memory / L1</b> per block/SM · explicitly reusable</span><span><b>L2 cache</b> device-wide · hardware managed</span><span><b>HBM</b> device memory · large · expensive traffic</span><span><b>Host memory</b> PCIe/NVLink transfer boundary</span></div>
      <p>Coalescing occurs when neighboring threads access neighboring addresses, allowing memory transactions to be combined. Strided access can waste transaction bandwidth. A transpose kernel is therefore not just index arithmetic; its tile layout decides whether reads and writes coalesce.</p>
      <h4>Reasoning exercise</h4><p>Two kernels perform identical FLOPs. Kernel A reads each element once and reuses it from shared memory eight times. Kernel B reloads it from HBM eight times. Predict which roofline region each occupies and what profiler counters would support the claim.</p></div>
    </section>
    <section class="lesson">
      <div class="lesson-number">00.5</div><div><h3>Roofline analysis</h3>
      <div class="equation">Arithmetic intensity = operations / bytes moved<br>attainable performance ≤ min(peak FLOP/s, bandwidth × intensity)</div>
      <p>Count bytes at the memory level relevant to the claim. For C=A+B over N FP32 values with no cache reuse, read 2N values and write N: roughly 12N bytes for N additions, or 1/12 FLOP/byte. Matrix multiplication reuses input tiles and has much higher arithmetic intensity.</p>
      <p>The ridge point is peak FLOP/s divided by peak memory bandwidth. Below it, a kernel is theoretically bandwidth-bound; above it, compute-bound. Real performance also loses efficiency to launch overhead, poor occupancy, uncoalesced access, synchronization, and imperfect instruction mix.</p>
      <div class="task"><b>Lab B — Predict, then measure</b><p>Estimate FLOPs and bytes for elementwise add, reduction, and square GEMM. Plot achieved bandwidth or FLOP/s across sizes. Annotate the launch-bound, bandwidth-bound, and compute-bound regions.</p></div></div>
    </section>
    <section class="lesson">
      <div class="lesson-number">00.6</div><div><h3>Benchmarking without lying to yourself</h3>
      <pre class="lesson-code"><code>import statistics, torch

def cuda_benchmark(fn, warmup=20, repeats=100):
    for _ in range(warmup):
        fn()
    torch.cuda.synchronize()
    samples = []
    for _ in range(repeats):
        start = torch.cuda.Event(enable_timing=True)
        end = torch.cuda.Event(enable_timing=True)
        start.record(); fn(); end.record()
        end.synchronize()
        samples.append(start.elapsed_time(end))
    samples.sort()
    return {
        "p50_ms": samples[len(samples) // 2],
        "p95_ms": samples[int(len(samples) * .95)],
        "mean_ms": statistics.mean(samples),
    }</code></pre>
      <p>GPU launches are asynchronous. Timing with host timestamps without synchronization often measures enqueue time. Warm-up removes first-run effects such as context initialization and kernel selection. Keep allocations outside the timed region unless allocation is part of the system being studied. Record hardware, software versions, clocks/power policy, shapes, dtypes, warm-up, repeats, and summary statistics.</p>
      <div class="warning"><b>Common invalid comparisons</b><p>Different precision, different output quality, hidden synchronization, different batch sizes, timed data transfer on only one path, too few repetitions, and reporting only the fastest sample.</p></div></div>
    </section>
    <section class="lesson">
      <div class="lesson-number">00.7</div><div><h3>Serving metrics and queueing</h3>
      <table><thead><tr><th>Metric</th><th>Definition</th><th>What it reveals</th></tr></thead><tbody><tr><td>TTFT</td><td>first token time − arrival time</td><td>Queueing plus prefill and scheduling delay</td></tr><tr><td>TPOT</td><td>mean gap between output tokens</td><td>Decode responsiveness</td></tr><tr><td>E2E latency</td><td>finish time − arrival time</td><td>Total user-visible completion time</td></tr><tr><td>Throughput</td><td>completed tokens or requests / second</td><td>Raw system capacity</td></tr><tr><td>Goodput</td><td>requests meeting SLO / second</td><td>Useful capacity under latency constraints</td></tr><tr><td>p99</td><td>99th percentile observation</td><td>Tail behavior hidden by the mean</td></tr></tbody></table>
      <p>Always distinguish service time from queueing time and prompt tokens from generated tokens. Workload arrival rate and prompt/output length distributions are part of the experiment. Throughput measured with an always-full offline batch does not predict online goodput under an SLO.</p></div>
    </section>
    <section class="assessment"><h3>Module 00 assessment</h3>
      <div class="assessment-grid"><div><b>Implementation</b><p>Tensor inspector plus reproducible benchmark harness.</p></div><div><b>Experiment</b><p>Compare transpose/view/contiguous and three numerical formats.</p></div><div><b>Analysis</b><p>Classify three workloads using roofline reasoning and profiler evidence.</p></div><div><b>Report</b><p>4–6 pages: method, results, limitations, and reproducibility appendix.</p></div></div>
      <h4>Pass criteria</h4><ul><li>All shape, stride, aliasing, and byte predictions are correct.</li><li>Benchmarks synchronize correctly and include p50/p95 over at least 100 measured runs.</li><li>Every performance claim is tied to measured evidence rather than wall-clock intuition.</li><li>The report identifies at least three threats to validity.</li></ul>
      <h4>Primary reading</h4><p>PyTorch tensor and CUDA semantics documentation; NVIDIA CUDA C++ Programming Guide sections on execution and memory; Williams et al., <em>Roofline: An Insightful Visual Performance Model</em>.</p>
    </section>`,
    code: `def describe(x):\n    return {\n        "shape": tuple(x.shape),\n        "stride": x.stride(),\n        "dtype": str(x.dtype),\n        "bytes": x.numel() * x.element_size(),\n        "contiguous": x.is_contiguous(),\n        "device": str(x.device),\n    }`,
    check: "Can you predict whether a transpose changes storage, and explain when a contiguous copy appears?"
  },
  {
    id: "attention", index: "01", title: "Scaled dot-product attention", duration: "1–2 weeks",
    summary: "Derive attention from similarity scores and implement masking, normalization, and stable softmax from first principles.",
    concepts: ["Q/K/V projections", "Causal and padding masks", "Stable softmax", "O(n²d) complexity", "Self- vs cross-attention"],
    detail: `<h4>Derivation</h4><p>For token matrix X ∈ ℝⁿˣᵈ, learned projections produce Q=XWq, K=XWk, V=XWv. The score qᵢ·kⱼ measures compatibility. If independent components have unit variance, the dot product variance grows with dₖ; dividing by √dₖ prevents softmax saturation. A causal mask assigns −∞ to future positions before softmax.</p><p>Stable softmax subtracts the row maximum: exp(xᵢ−m)/Σⱼexp(xⱼ−m). This leaves the result unchanged but prevents overflow. Masking after softmax is wrong because it does not renormalize the surviving probabilities.</p><h4>Correctness tests</h4><p>Check row sums equal one, masked probabilities equal zero, outputs match a trusted implementation, and float32 reference error remains bounded under lower precision.</p>`,
    longform: `<div class="course-intro">
      <div><span>10 study days</span><strong>20–28 hours</strong><small>Derivation 7h · implementation 10h · testing/profiling 8h · report 3h</small></div>
      <p><b>Exit criterion.</b> You can derive scaled dot-product attention, implement every operation without a high-level attention API, prove masking correctness, validate gradients, calculate compute/memory complexity, and diagnose numerical or shape failures.</p>
    </div>
    <div class="study-plan"><h3>Two-week study plan</h3><div class="day-grid">
      <article><span>Day 01</span><b>Similarity and retrieval</b><p>Dot products, cosine similarity, weighted retrieval.</p></article>
      <article><span>Day 02</span><b>Q, K, and V</b><p>Learned projections, axis semantics, score geometry.</p></article>
      <article><span>Day 03</span><b>Scaling</b><p>Variance derivation, saturation, gradient behavior.</p></article>
      <article><span>Day 04</span><b>Stable softmax</b><p>Log-sum-exp, precision, fully masked rows.</p></article>
      <article><span>Day 05</span><b>Masking</b><p>Causal, padding, additive and boolean masks.</p></article>
      <article><span>Day 06</span><b>Implementation</b><p>Single-head batched attention from primitives.</p></article>
      <article><span>Day 07</span><b>Correctness</b><p>Oracle comparison, invariants, gradient checks.</p></article>
      <article><span>Day 08</span><b>Complexity</b><p>FLOPs, score memory, prefill versus decode.</p></article>
      <article><span>Day 09</span><b>Profiling</b><p>Sequence-length sweep and bottleneck analysis.</p></article>
      <article><span>Day 10</span><b>Reproduction note</b><p>Methods, plots, failure cases, research questions.</p></article>
    </div></div>
    <section class="lesson"><div class="lesson-number">01.1</div><div><h3>Attention as differentiable retrieval</h3>
      <p>A query describes what the current position seeks. Keys describe what each source position offers for matching. Values contain the content returned after matching. With Q∈ℝ<sup>B×Tq×Dk</sup>, K∈ℝ<sup>B×Tk×Dk</sup>, and V∈ℝ<sup>B×Tk×Dv</sup>, scores have shape [B,Tq,Tk] and output has [B,Tq,Dv].</p>
      <div class="equation">S = QKᵀ / √d<sub>k</sub><br>P = softmax(S + M)<br>O = PV</div>
      <p>Each row of P is a probability distribution over key positions. Therefore each output row is a convex combination of value rows when values are real vectors. Q and K determine routing; V determines transported content.</p>
      <h4>Manual exercise</h4><p>Let q=[1,0], k₁=[1,0], k₂=[0,1], v₁=[2,0], v₂=[0,4]. Compute unscaled scores, probabilities, and output. Repeat with q=[1,1]. Explain why changing V never changes the probability matrix.</p></div></section>
    <section class="lesson"><div class="lesson-number">01.2</div><div><h3>Learned projections</h3>
      <p>Self-attention begins with one hidden-state matrix X, but Q=XWq, K=XWk, and V=XWv use different learned projections. This lets the same token expose different features for asking, matching, and carrying information. Cross-attention instead takes queries from one sequence and keys/values from another.</p>
      <pre class="lesson-code"><code>import torch
import torch.nn as nn

class SingleHeadAttention(nn.Module):
    def __init__(self, d_model, d_head):
        super().__init__()
        self.q_proj = nn.Linear(d_model, d_head, bias=False)
        self.k_proj = nn.Linear(d_model, d_head, bias=False)
        self.v_proj = nn.Linear(d_model, d_head, bias=False)
        self.out_proj = nn.Linear(d_head, d_model, bias=False)

    def forward(self, x, mask=None):
        q, k, v = self.q_proj(x), self.k_proj(x), self.v_proj(x)
        scores = q @ k.transpose(-2, -1) * (q.size(-1) ** -0.5)
        if mask is not None:
            scores = scores.masked_fill(~mask, float("-inf"))
        probs = torch.softmax(scores.float(), dim=-1).to(x.dtype)
        return self.out_proj(probs @ v), probs</code></pre>
      <p>Annotate every intermediate shape for input [B,T,d_model]. Then extend the method to accept separate query and context tensors. Do not add multiple heads yet.</p></div></section>
    <section class="lesson"><div class="lesson-number">01.3</div><div><h3>Why divide by √dₖ?</h3>
      <p>Assume qᵢ and kᵢ are independent, zero-mean, unit-variance random variables. The dot product is Σᵢqᵢkᵢ. Each product has variance one, so the sum has variance dₖ and standard deviation √dₖ. Dividing by √dₖ returns score variance to approximately one.</p>
      <p>Without scaling, increasing dₖ produces larger logits. Softmax becomes nearly one-hot, most derivatives shrink, and optimization becomes brittle. Scaling is therefore about controlling logit statistics, not changing tensor dimensions.</p>
      <pre class="lesson-code"><code>torch.manual_seed(7)
for d in [8, 32, 128, 512, 2048]:
    q = torch.randn(50_000, d)
    k = torch.randn(50_000, d)
    raw = (q * k).sum(-1)
    scaled = raw / d ** 0.5
    print(d, raw.std().item(), scaled.std().item())

# Expected pattern: raw std grows near sqrt(d);
# scaled std remains near 1.</code></pre>
      <div class="task"><b>Lab A — Empirical derivation</b><p>Plot raw and scaled score standard deviation against dₖ. Repeat for correlated q/k and non-unit variance. State which assumptions fail and whether √dₖ remains sufficient.</p></div></div></section>
    <section class="lesson"><div class="lesson-number">01.4</div><div><h3>Stable softmax and masked rows</h3>
      <p>Softmax is shift invariant: softmax(x)=softmax(x−c). Choosing c=max(x) makes the largest exponent one and all others at most one, preventing positive overflow. The denominator remains susceptible to underflow for extremely negative terms, but those terms legitimately contribute almost zero.</p>
      <pre class="lesson-code"><code>def stable_softmax(x, dim=-1):
    work = x.float()                 # accumulate in FP32
    maximum = work.amax(dim=dim, keepdim=True)
    exps = torch.exp(work - maximum)
    return (exps / exps.sum(dim=dim, keepdim=True)).to(x.dtype)

x = torch.tensor([[1000., 1001., 1002.]])
assert torch.isfinite(stable_softmax(x)).all()
torch.testing.assert_close(stable_softmax(x), torch.softmax(x, -1))</code></pre>
      <p>A fully masked row contains only −∞. Subtracting its maximum computes −∞−(−∞), producing NaN. A production implementation must define semantics: reject the input, ensure at least one valid key, or explicitly zero the row after a safe masked softmax.</p>
      <div class="warning"><b>Failure mode</b><p>Multiplying probabilities by a zero-one mask after softmax is incorrect: forbidden positions influenced the denominator, and remaining probabilities no longer sum to one.</p></div></div></section>
    <section class="lesson"><div class="lesson-number">01.5</div><div><h3>Causal and padding masks</h3>
      <p>A causal mask permits key index j≤i for query i. A padding mask excludes invalid key positions independently for each batch item. Combine permissions with logical AND before applying them. With cached decoding, query length may be one while key length is the entire prefix, so a square triangular mask is not generally correct.</p>
      <pre class="lesson-code"><code>def make_mask(valid_lengths, q_len, k_len, q_offset=0):
    # valid_lengths: [B]
    q_pos = torch.arange(q_offset, q_offset + q_len)[:, None]
    k_pos = torch.arange(k_len)[None, :]
    causal = k_pos &lt;= q_pos                         # [Tq, Tk]
    valid = k_pos[None, :, :] &lt; valid_lengths[:, None, None]
    return causal[None, :, :] &amp; valid               # [B, Tq, Tk]</code></pre>
      <p>Use boolean masks for clear semantics, then convert to the representation required by the kernel. Additive masks use zero for allowed positions and a sufficiently negative value for forbidden positions. Beware that the most negative finite FP16 value is not mathematically −∞.</p></div></section>
    <section class="lesson"><div class="lesson-number">01.6</div><div><h3>A complete primitive implementation</h3>
      <pre class="lesson-code"><code>def scaled_dot_product_attention(q, k, v, mask=None, dropout_p=0.0,
                                 training=False, return_probs=False):
    """q:[B,Tq,Dk], k:[B,Tk,Dk], v:[B,Tk,Dv]."""
    if q.ndim != 3 or k.ndim != 3 or v.ndim != 3:
        raise ValueError("q, k, and v must be rank three")
    if q.shape[0] != k.shape[0] or k.shape[:2] != v.shape[:2]:
        raise ValueError("batch and key/value sequence axes must agree")
    if q.shape[-1] != k.shape[-1]:
        raise ValueError("query and key feature dimensions must agree")

    scores = torch.matmul(q, k.transpose(-2, -1)) / q.shape[-1] ** 0.5
    if mask is not None:
        if mask.shape != scores.shape:
            mask = torch.broadcast_to(mask, scores.shape)
        if (~mask).all(dim=-1).any():
            raise ValueError("every query must have at least one valid key")
        scores = scores.masked_fill(~mask, float("-inf"))

    probs = torch.softmax(scores.float(), dim=-1).to(q.dtype)
    probs = torch.dropout(probs, dropout_p, training)
    output = torch.matmul(probs, v)
    return (output, probs) if return_probs else output</code></pre>
      <p>Keep probability computation in FP32 and cast back for value aggregation. This reference prioritizes clarity and correctness; it materializes the entire score matrix and is not an optimized serving kernel.</p></div></section>
    <section class="lesson"><div class="lesson-number">01.7</div><div><h3>Correctness and gradient tests</h3>
      <pre class="lesson-code"><code>import torch.nn.functional as F

def test_against_oracle(device="cuda", dtype=torch.float32):
    torch.manual_seed(123)
    q = torch.randn(2, 7, 16, device=device, dtype=dtype, requires_grad=True)
    k = torch.randn(2, 9, 16, device=device, dtype=dtype, requires_grad=True)
    v = torch.randn(2, 9, 12, device=device, dtype=dtype, requires_grad=True)
    mask = torch.rand(2, 7, 9, device=device) &gt; .2
    mask[..., 0] = True

    ours = scaled_dot_product_attention(q, k, v, mask)
    oracle = F.scaled_dot_product_attention(
        q[:, None], k[:, None], v[:, None],
        attn_mask=mask[:, None], dropout_p=0.0
    )[:, 0]
    torch.testing.assert_close(ours, oracle, rtol=1e-4, atol=1e-5)

    loss = ours.square().mean()
    loss.backward()
    assert all(torch.isfinite(x.grad).all() for x in (q, k, v))</code></pre>
      <h4>Required invariants</h4><ul><li>Probability rows sum to one within tolerance.</li><li>Masked positions are exactly zero.</li><li>Output shape is [B,Tq,Dv].</li><li>Identical duplicated keys split probability mass symmetrically.</li><li>Permuting K and V together leaves output unchanged.</li><li>Naive and oracle forward outputs and gradients agree.</li></ul>
      <p>Use <code>torch.autograd.gradcheck</code> with double precision and tiny tensors for a numerical gradient check. Test invalid shapes and fully masked queries explicitly.</p></div></section>
    <section class="lesson"><div class="lesson-number">01.8</div><div><h3>Complexity and serving consequences</h3>
      <p>For self-attention with sequence length T and head width D, forming QKᵀ costs approximately 2T²D FLOPs and multiplying PV costs another 2T²D. The score/probability matrix requires O(T²) temporary storage in the naive implementation. Q/K/V projections add terms proportional to T and model-width products.</p>
      <table><thead><tr><th>Phase</th><th>Query length</th><th>Key length</th><th>Dominant behavior</th></tr></thead><tbody><tr><td>Prefill</td><td>T</td><td>T</td><td>Large matrix operations; substantial parallelism</td></tr><tr><td>Decode step</td><td>1</td><td>T</td><td>Read growing K/V cache; low reuse per request</td></tr></tbody></table>
      <p>The per-step decode attention cost is O(TD), but generating T tokens across the whole sequence accumulates quadratic work. More importantly for serving, each step reads stored K/V, making decode attention strongly sensitive to memory bandwidth and cache layout.</p>
      <div class="task"><b>Lab B — Scaling experiment</b><p>Sweep T={128,256,512,1024,2048,4096}. Record latency, allocated memory, achieved throughput, and maximum error against the oracle for FP32, FP16, and BF16. Plot latency/T² for prefill and latency/T for single-query decode.</p></div></div></section>
    <section class="assessment"><h3>Module 01 assessment</h3>
      <div class="assessment-grid"><div><b>Derivation</b><p>Explain score variance and stable softmax without notes.</p></div><div><b>Implementation</b><p>Primitive attention with cross-attention and combined masks.</p></div><div><b>Validation</b><p>Forward, gradient, invariant, adversarial, and dtype tests.</p></div><div><b>Analysis</b><p>Sequence sweep with prefill/decode complexity interpretation.</p></div></div>
      <h4>Pass criteria</h4><ul><li>Forward and gradient results match the PyTorch oracle within declared tolerances.</li><li>Every mask is defined by allowed positions, broadcasts intentionally, and handles invalid rows.</li><li>The report separates theoretical complexity, allocated memory, kernel time, and end-to-end time.</li><li>You can explain why this naive implementation motivates FlashAttention and KV caching.</li></ul>
      <h4>Primary reading</h4><p>Vaswani et al., <em>Attention Is All You Need</em>, sections 3.2–3.4; PyTorch scaled dot-product attention documentation and implementation notes. Record equations, assumptions, implementation differences, and open questions in a research notebook.</p>
    </section>`,
    code: `def attention(q, k, v, causal=False):\n    # Contract: q=[B,T,D], k/v=[B,T,D] for this self-attention reference.\n    if q.ndim != 3 or k.ndim != 3 or v.ndim != 3:\n        raise ValueError("q, k, and v must be rank 3")\n    if q.shape != k.shape or k.shape != v.shape:\n        raise ValueError("this causal reference requires equal q/k/v shapes")\n    scale = q.size(-1) ** -0.5\n    scores = q @ k.transpose(-2, -1) * scale\n    if causal:\n        t = scores.size(-1)\n        forbidden = torch.ones(t, t, device=q.device, dtype=torch.bool).triu(1)\n        scores = scores.masked_fill(forbidden, float("-inf"))\n    probs = torch.softmax(scores.float(), dim=-1).to(q.dtype)\n    return probs @ v`,
    check: "Can you explain both the statistical reason for √dₖ and the numerical reason for max subtraction?"
  },
  {
    id: "transformer", index: "02", title: "Decoder-only Transformer", duration: "2–3 weeks",
    summary: "Assemble embeddings, normalization, residual streams, RoPE, attention, and gated MLPs into a causal language model.",
    concepts: ["Pre-norm residual blocks", "RMSNorm", "RoPE", "SwiGLU MLP", "Logits and autoregressive sampling"],
    detail: `<h4>The residual stream</h4><p>Modern decoder blocks commonly use pre-normalization: h←h+Attention(Norm(h)), then h←h+MLP(Norm(h)). The residual stream preserves an identity path through deep networks. RMSNorm scales by the inverse root-mean-square without subtracting a mean.</p><p>RoPE rotates pairs of query and key coordinates by position-dependent angles. The inner product between rotated vectors depends on relative position, while values are not rotated. During cached decoding, the new token must use its absolute position offset—not position zero.</p><h4>Deliverable</h4><p>Implement a small decoder that matches an uncached reference token-for-token. Add temperature, top-k, and nucleus sampling only after greedy decoding is exact.</p>`,
    code: `class Block(nn.Module):\n    def forward(self, x, cache=None, pos=0):\n        a, cache = self.attn(self.norm1(x), cache, pos)\n        x = x + a\n        x = x + self.mlp(self.norm2(x))\n        return x, cache\n\n# SwiGLU\ndef mlp(x):\n    return down(F.silu(gate(x)) * up(x))`,
    check: "Can your cached and uncached greedy decoders produce identical token IDs for the same prompt?"
  },
  {
    id: "multihead", index: "03", title: "MHA, MQA, and GQA", duration: "1 week",
    summary: "Understand head geometry and why reducing KV heads changes serving memory and bandwidth without reducing query heads.",
    concepts: ["Head reshaping", "Independent attention subspaces", "Output projection", "Multi-query attention", "Grouped-query attention"],
    detail: `<h4>Head layout</h4><p>Given hidden width d and h query heads, dₕ=d/h. Starting from [B,T,d], first reshape to [B,T,h,dₕ], then transpose the T and h axes to obtain the attention layout [B,h,T,dₕ]. Each head computes attention independently; concatenated outputs are mixed by Wₒ. Heads are not automatically interpretable, but the separation creates multiple learned similarity spaces.</p><p>MHA has h KV heads. MQA uses one shared K/V head. GQA uses hₖᵥ heads, each serving a group of h/hₖᵥ query heads. Holding layer count, sequence length, head dimension, dtype, and batch size fixed, the KV payload ratio relative to MHA is hₖᵥ/h. Fewer KV heads can reduce decode-time KV capacity and read traffic; realized speedup still depends on the kernel and system bottleneck.</p><h4>Invariant</h4><p>Query heads must map deterministically to KV groups. When h is divisible by hₖᵥ and heads are grouped contiguously, a common mapping is kv_head = query_head // (h/hₖᵥ).</p>`,
    code: `# q: [B, Hq, Tq, D], k/v: [B, Hkv, Tk, D]\ngroups = num_q_heads // num_kv_heads\nk = k.repeat_interleave(groups, dim=1)\nv = v.repeat_interleave(groups, dim=1)\nout = attention(q, k, v, causal=True)\nout = out.transpose(1, 2).reshape(B, Tq, -1)`,
    check: "Can you calculate the KV-memory ratio of a 32-head MHA model and an 8-KV-head GQA model?"
  },
  {
    id: "kvcache", index: "04", title: "Autoregressive inference and KV cache", duration: "2 weeks",
    summary: "Separate prefill from decode, eliminate repeated projection work, and account for every byte retained per request.",
    concepts: ["Prefill vs decode", "Per-layer K/V storage", "Cache positions", "Capacity formula", "Compute-bound vs bandwidth-bound phases"],
    detail: `<h4>Why caching works</h4><p>At decode step t, past token representations do not change. Recomputing their keys and values repeats work, so each layer stores them and appends only Kₜ,Vₜ. Queries are needed only for the current token. A useful conceptual shape is [layers, 2(K/V), batch, kv_heads, sequence, head_dim], but this is not a universal physical layout: engines may place layer, K/V, block, token, or head axes differently to match their kernels.</p><p>For sequences with equal stored length, payload bytes = 2 × layers × tokens × kv_heads × head_dim × bytes_per_element × active_sequences. With variable lengths, sum the stored token count over sequences instead of multiplying by one common length. This excludes allocator metadata, alignment, block tables, temporary workspaces, and model weights.</p><h4>Critical edge cases</h4><p>Track absolute RoPE position; distinguish allocated capacity from valid length; mask unused slots; handle prompt lengths independently; and release cache ownership exactly once on completion or cancellation.</p>`,
    code: `@dataclass\nclass LayerCache:\n    k: torch.Tensor  # [B, Hkv, capacity, D]\n    v: torch.Tensor\n    length: int = 0\n\ndef append(cache, k_new, v_new):\n    if k_new.shape != v_new.shape:\n        raise ValueError("new K and V shapes must match in this reference")\n    s = cache.length\n    e = s + k_new.size(-2)\n    if e > cache.k.size(-2):\n        raise RuntimeError("KV cache capacity exceeded")\n    cache.k[..., s:e, :].copy_(k_new)\n    cache.v[..., s:e, :].copy_(v_new)\n    cache.length = e\n    return cache.k[..., :e, :], cache.v[..., :e, :]`,
    check: "Can you derive cache size without memorizing the formula and identify what the formula omits?"
  },
  {
    id: "kernels", index: "05", title: "Attention kernels and FlashAttention", duration: "2 weeks",
    summary: "Move from mathematically equivalent operations to IO-aware kernels that avoid materializing the full score matrix.",
    concepts: ["Kernel fusion", "Tiling", "Online softmax", "HBM vs SRAM traffic", "FlashAttention", "Paged decode kernels"],
    detail: `<h4>IO awareness</h4><p>Naive attention materializes an n×n score matrix in high-bandwidth memory. FlashAttention tiles Q, K, and V into on-chip SRAM and maintains online softmax statistics, reducing HBM traffic while remaining exact up to floating-point ordering.</p><p>For blocks of scores S, track running maximum m and normalizer ℓ. When a block raises the maximum, rescale the previous accumulator by exp(m_old−m_new). This lets separately processed tiles compose into the same normalized result.</p><h4>Profiling</h4><p>Measure kernel duration, achieved bandwidth, occupancy, memory allocation, and end-to-end latency. A faster isolated kernel may not improve serving if scheduling gaps or CPU overhead dominate.</p>`,
    code: `# Online softmax state for one query row\nm, l, acc = -float("inf"), 0.0, 0.0\nfor scores, values in tiles:\n    tile_m = scores.max()\n    new_m = max(m, tile_m)\n    alpha = exp(m - new_m)\n    p = exp(scores - new_m)\n    l = alpha * l + p.sum()\n    acc = alpha * acc + (p[:, None] * values).sum(0)\n    m = new_m\nout = acc / l`,
    check: "Can you explain why FlashAttention is exact attention and why fewer FLOPs is not its primary claim?"
  },
  {
    id: "scheduling", index: "06", title: "Orca and continuous batching", duration: "2–3 weeks",
    summary: "Model inference as iterations, admit and retire requests dynamically, and reason about fairness and head-of-line blocking.",
    concepts: ["Iteration-level scheduling", "Selective batching", "Request lifecycle", "Prefill/decode interference", "SLO-aware admission"],
    detail: `<h4>From batch to iteration</h4><p>Static batching holds a slot until every sequence in the batch finishes, wasting capacity when output lengths differ. Orca-style iteration-level scheduling forms work at each model iteration: finished requests leave and waiting requests enter. Selective batching applies operations such as attention with per-request state while batching operations that share compatible shapes.</p><p>Continuous batching improves utilization but introduces policy choices. Large prefills can delay decode tokens; prioritizing every decode can starve queued prompts. A scheduler needs explicit budgets, admission rules, and fairness objectives.</p><h4>State machine</h4><p>WAITING → PREFILLING → RUNNING → FINISHED, with cancellation and preemption paths. Keep scheduler state separate from GPU execution so policy can be tested deterministically.</p>`,
    code: `def plan_iteration(waiting, running, token_budget, chunk_size=256):\n    plan = []\n    # Planning is side-effect free: execution updates request state afterward.\n    for req in running:\n        if token_budget == 0:\n            break\n        plan.append((req.id, "decode", 1))\n        token_budget -= 1\n    for req in waiting:\n        if token_budget == 0:\n            break\n        n = min(req.prompt_remaining, token_budget, chunk_size)\n        plan.append((req.id, "prefill", n))\n        token_budget -= n\n    return plan`,
    check: "Can you construct a workload where continuous batching improves throughput but worsens p99 TPOT?"
  },
  {
    id: "paged", index: "07", title: "PagedAttention and cache virtualization", duration: "2–3 weeks",
    summary: "Decouple logical token positions from physical cache storage using blocks, block tables, and reference counts.",
    concepts: ["Logical vs physical blocks", "Block tables", "Internal/external fragmentation", "Copy-on-write", "Prefix sharing"],
    detail: `<h4>Virtualized cache</h4><p>A contiguous cache reserves one growing region per sequence and struggles with unknown output lengths. A paged cache divides physical KV storage into fixed-size blocks. Each sequence owns a logical block table whose entries point to arbitrary physical blocks. The attention kernel translates a token position into block index and offset.</p><p>External fragmentation is largely removed because any free block can serve the next logical block. Internal waste remains in the last partially filled block and is bounded by block_size−1 tokens per sequence. Smaller blocks reduce waste but enlarge tables and allocation overhead.</p><h4>Sharing and safety</h4><p>Shared prompts can reference the same blocks. Reference counting determines lifetime; copy-on-write is required before modifying a shared partial block. Allocation failure must be handled before launching a kernel.</p>`,
    code: `class BlockTable:\n    def __init__(self, pool, block_size):\n        self.pool, self.block_size = pool, block_size\n        self.blocks, self.length = [], 0\n\n    def append_slot(self):\n        offset = self.length % self.block_size\n        if offset == 0:\n            self.blocks.append(self.pool.allocate())\n        physical = self.blocks[self.length // self.block_size]\n        self.length += 1\n        return physical, offset\n\n    def release(self):\n        for block in self.blocks:\n            self.pool.decref(block)`,
    check: "Can you bound worst-case internal waste and explain the block-size trade-off?"
  },
  {
    id: "production", index: "08", title: "Production serving and research", duration: "ongoing",
    summary: "Integrate parallelism, quantization, observability, reproducible evaluation, and research methodology.",
    concepts: ["Tensor/pipeline/data parallelism", "Quantization", "Disaggregated prefill", "Tail latency and goodput", "Experimental design"],
    detail: `<h4>System boundary</h4><p>A serving engine includes API admission, tokenization, request queues, model workers, collective communication, cache ownership, streaming, cancellation, and metrics. Distributed designs trade communication for capacity. Tensor parallelism adds collectives within layers; pipeline parallelism introduces bubbles; disaggregated prefill/decode adds KV transfer and routing.</p><p>Goodput counts requests that meet an SLO, not merely completed tokens. Always report workload distributions and tail metrics. Warm the system, pin software and hardware versions, repeat runs, disclose failures, and attach confidence intervals.</p><h4>Research readiness</h4><p>Reproduce one published baseline, identify a measurable failure regime, implement one isolated mechanism, and run controlled ablations before expanding scope.</p>`,
    code: `@dataclass\nclass Metrics:\n    arrival: float\n    first_token: float | None = None\n    token_times: list[float] = field(default_factory=list)\n    finish: float | None = None\n\n    def ttft(self):\n        if self.first_token is None:\n            return None\n        return self.first_token - self.arrival\n\n    def tpot(self):\n        # TPOT needs at least two output-token timestamps.\n        if len(self.token_times) < 2:\n            return None\n        return float(np.diff(self.token_times).mean())`,
    check: "Can another researcher reproduce your claim from the workload, configuration, code, and seeds you report?"
  }
];
