# Inference Atlas

A code-first curriculum and interactive laboratory for mastering LLM serving
architecture, using [Learning AI](https://gatherheart.github.io/learningAI/) as
the conceptual starting point.

The site covers tensor and GPU foundations, attention, decoder-only
Transformers, MHA/MQA/GQA, KV caching, FlashAttention, Orca-style continuous
batching, PagedAttention, production serving, and research methodology.

## Run locally

```bash
python3 -m http.server 8000 --directory dist
```

Then open `http://localhost:8000`.

The site is dependency-free: all content, styling, calculators, and simulations
are implemented in HTML, CSS, and JavaScript.

## Live Site

- https://gatherheart.github.io/learningAI

## Original Learning AI Topics

- Vector dot products and perceptrons
- Gradient descent and softmax
- Attention and Transformer blocks
- Training-loop flow and next-token prediction

## Legacy Runtime

The original application uses Node.js 25.9.0 and the usual `npm install`,
`npm run dev`, and `npm run build` workflow. The Inference Atlas materials in
`dist/` are dependency-free and can also be served as static files.
