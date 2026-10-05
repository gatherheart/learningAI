# Curriculum correctness audit

This document records the technical review of the Inference Atlas curriculum.
It is intentionally separate from the teaching copy so that corrections and
assumptions remain visible.

## Audit contract

- The default logical attention layout is `[B,H,T,D]`.
- `[B,T,H,D]` is used only for the intermediate result immediately after a
  head split and before transposing `T` and `H`.
- A physical kernel or cache layout is never implied to be universal.
- FLOP counts state the convention that one multiply and one add count as two
  operations.
- Memory equations distinguish logical payload from allocator, alignment,
  metadata, block-table, workspace, and model-weight costs.
- Reference code prioritizes correctness and declares its shape contract. It
  must not silently claim support for cached or cross attention when it only
  implements square self-attention.

## Errors found and corrected

1. The foundations chapter described `[B,T,H,D]` and immediately used examples
   that were actually `[B,H,T,D]`. The chapter now distinguishes the pre- and
   post-transpose layouts explicitly.
2. The multi-head chapter skipped the `[B,T,H,D]` intermediate and incorrectly
   described a direct reshape to `[B,H,T,D]`. It now specifies reshape followed
   by transpose.
3. The compact causal-attention reference appeared valid for non-square
   `Tq != Tk` inputs even though `triu(1)` only represented aligned square
   self-attention. Its contract is now explicit and validated.
4. The KV-cache reference wrote into a fixed buffer without a capacity check.
   It now rejects overflow before mutation.
5. The KV-memory equation looked universal. It now distinguishes equal-length
   multiplication from summing variable sequence lengths and lists excluded
   overheads.
6. The GQA payload ratio omitted its fixed-variable assumptions. Those
   conditions are now stated.
7. The scheduler reference mutated queue state during planning and did not show
   a complete transition. Planning is now side-effect free; state changes are
   assigned to the post-execution transition step.
8. TPOT returned zero when fewer than two output-token timestamps existed.
   This is undefined, not zero, so the reference now returns `None`.
9. The educational RMSNorm example accumulated squares in the input dtype.
   It now shows FP32 accumulation and states that fused-kernel behavior must be
   verified for the concrete implementation.

## Executable checks

Run:

```bash
node scripts/audit_curriculum.mjs
```

The script checks module coverage, declared tensor conventions, the QK shape
and byte example, stable softmax, causal-mask direction, attention FLOPs, GQA
mapping, KV payload arithmetic, online-softmax equivalence, scheduler behavior,
paged-cache waste bounds, and undefined metric states.

## Limits of this audit

The checks validate the mathematical and algorithmic claims represented in the
site. They do not certify a specific GPU kernel, allocator, framework release,
or model checkpoint. Those require implementation-specific source review and
hardware measurements. No external sources were fetched during this audit;
network access was not assumed.
