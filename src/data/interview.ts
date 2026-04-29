export interface InterviewQuestion {
  id: string;
  level: "junior" | "mid" | "senior";
  topic: string;
  title: string;
  prompt: string[];
  options: string[];
  answer: number;
  explanation: string;
}

export const interviewQuestions: InterviewQuestion[] = [
  {
    id: "shape_reasoning",
    level: "junior",
    topic: "basics",
    title: "Shape reasoning",
    prompt: [
      "Why does shape reasoning matter so much in practical ML work?",
    ],
    options: [
      "Because many correctness failures are really invalid operation or data-flow shape mismatches.",
      "Because shape replaces the need for data.",
      "Because only image models use shapes.",
    ],
    answer: 0,
    explanation:
      "A large amount of real ML debugging reduces to understanding whether the tensors being combined actually fit the intended computation.",
  },
  {
    id: "feature_vs_label",
    level: "junior",
    topic: "data",
    title: "Feature versus label",
    prompt: [
      "What is the cleanest distinction between features and labels in supervised learning?",
    ],
    options: [
      "Features are the observed inputs and labels are the target outputs the model is trained to predict.",
      "Labels are always text while features are always numbers.",
      "Features exist only after the model is trained.",
    ],
    answer: 0,
    explanation:
      "The distinction is about input and target roles in the learning objective, not about data format.",
  },
  {
    id: "dot_product_role",
    level: "junior",
    topic: "math",
    title: "Dot product role",
    prompt: [
      "Why does the dot product appear constantly in ML models?",
    ],
    options: [
      "Because weighted scoring and alignment are core operations in linear layers and similarity calculations.",
      "Because it automatically normalizes data.",
      "Because it only matters in computer vision.",
    ],
    answer: 0,
    explanation:
      "Weighted sums and alignment scores are everywhere in machine learning, which is why the dot product keeps recurring.",
  },
  {
    id: "loss_function_purpose",
    level: "junior",
    topic: "losses",
    title: "Why a loss is needed",
    prompt: [
      "Why is a loss function required for training at all?",
    ],
    options: [
      "Because without a measurable notion of error, optimization has no direction.",
      "Because a loss formats the output text.",
      "Because it replaces model parameters.",
    ],
    answer: 0,
    explanation:
      "A model can produce numbers, but training needs a quantitative objective that says what should improve.",
  },
  {
    id: "activation_non_linearity",
    level: "junior",
    topic: "activations",
    title: "Why activations matter",
    prompt: [
      "Why do neural networks need nonlinear activations between linear layers?",
    ],
    options: [
      "Without nonlinearity, stacked linear layers collapse into another linear transformation.",
      "Because activations remove the need for data.",
      "Because they make gradients disappear on purpose.",
    ],
    answer: 0,
    explanation:
      "Depth only buys expressive power when nonlinear transformations exist between linear operations.",
  },
  {
    id: "embedding_reason",
    level: "junior",
    topic: "embeddings",
    title: "Why embeddings exist",
    prompt: [
      "Why is an embedding layer used for token IDs?",
    ],
    options: [
      "Because raw IDs are arbitrary labels, while embeddings provide learned continuous representations.",
      "Because embeddings remove the need for tokenization.",
      "Because IDs are too large to print.",
    ],
    answer: 0,
    explanation:
      "Embedding lookup is the bridge from discrete symbols to continuous model computation.",
  },
  {
    id: "overfitting_basic_reason",
    level: "junior",
    topic: "generalization",
    title: "What overfitting means",
    prompt: [
      "What is the core meaning of overfitting?",
    ],
    options: [
      "The model captures training-set specifics too narrowly and fails to generalize well to unseen data.",
      "The model has too few parameters to represent anything.",
      "The dataset contains no labels.",
    ],
    answer: 0,
    explanation:
      "Overfitting is a generalization problem, not merely a statement about model size.",
  },
  {
    id: "train_val_test_split_reason",
    level: "junior",
    topic: "evaluation",
    title: "Why split data",
    prompt: [
      "Why keep separate training, validation, and test sets?",
    ],
    options: [
      "To separate fitting, model-selection feedback, and final unbiased evaluation as much as possible.",
      "Because models cannot read one dataset twice.",
      "Because training loss cannot be computed on the training set.",
    ],
    answer: 0,
    explanation:
      "The split helps avoid fooling yourself with feedback leakage and repeated tuning against the same evaluation signal.",
  },
  {
    id: "gradient_descent_sign",
    level: "mid",
    topic: "optimization",
    title: "Why subtract the gradient",
    prompt: [
      "Why does gradient descent update parameters in the opposite direction of the gradient?",
    ],
    options: [
      "Because the gradient points toward increasing loss locally.",
      "Because gradients are always negative.",
      "Because subtraction is just a convention with no meaning.",
    ],
    answer: 0,
    explanation:
      "The sign matters because the gradient indicates the direction of steepest local increase.",
  },
  {
    id: "backprop_chain_rule",
    level: "mid",
    topic: "optimization",
    title: "Backpropagation intuition",
    prompt: [
      "Why is the chain rule the core math behind backpropagation?",
    ],
    options: [
      "Because deep models are compositions of functions, so influence must be propagated through intermediate computations.",
      "Because it sorts parameters alphabetically.",
      "Because it removes the need for a loss function.",
    ],
    answer: 0,
    explanation:
      "Backprop is structured derivative bookkeeping across a composed computation graph.",
  },
  {
    id: "learning_rate_tradeoff",
    level: "mid",
    topic: "optimization",
    title: "Learning-rate tradeoff",
    prompt: [
      "Why is choosing a larger learning rate not simply better if it seems to make early training faster?",
    ],
    options: [
      "Because optimization can become unstable, overshoot good regions, or fail to converge.",
      "Because larger learning rates make every model deterministic.",
      "Because the loss function stops existing.",
    ],
    answer: 0,
    explanation:
      "Step size controls optimization stability as much as speed.",
  },
  {
    id: "tokenization_tradeoff",
    level: "mid",
    topic: "tokenization",
    title: "Tokenizer tradeoffs",
    prompt: [
      "Why is tokenization an architectural choice rather than only preprocessing trivia?",
    ],
    options: [
      "It affects vocabulary size, sequence length, efficiency, and what patterns can be represented compactly.",
      "It only affects UI formatting.",
      "It determines the optimizer directly.",
    ],
    answer: 0,
    explanation:
      "Tokenizer design shapes both modeling efficiency and what kinds of structure the model must learn from the text stream.",
  },
  {
    id: "softmax_cross_entropy_pair",
    level: "mid",
    topic: "probability",
    title: "Softmax and cross-entropy pairing",
    prompt: [
      "Why are softmax and cross-entropy so often paired in multiclass classification?",
    ],
    options: [
      "One turns raw scores into a probability distribution and the other penalizes the mismatch against the target.",
      "Because both are optimizers.",
      "Because they eliminate the need for logits.",
    ],
    answer: 0,
    explanation:
      "Prediction distribution and training objective play complementary roles.",
  },
  {
    id: "attention_score_meaning",
    level: "mid",
    topic: "attention",
    title: "Meaning of attention scores",
    prompt: [
      "What does a larger query-key score usually imply before softmax?",
    ],
    options: [
      "The queried position is more aligned with that key, so it may receive more attention weight.",
      "The sequence becomes shorter.",
      "The model skips the value vectors.",
    ],
    answer: 0,
    explanation:
      "Scores rank relevance before normalization; they are not the final output by themselves.",
  },
  {
    id: "residual_connection_reason",
    level: "mid",
    topic: "transformers",
    title: "Residual connection reason",
    prompt: [
      "Why are residual connections important in deep transformer stacks?",
    ],
    options: [
      "They let layers learn corrections on top of existing representations instead of rebuilding everything from scratch.",
      "They remove the need for feed-forward layers.",
      "They make the model linear again.",
    ],
    answer: 0,
    explanation:
      "Residual paths help optimization and information flow through deep networks.",
  },
  {
    id: "normalization_reason",
    level: "mid",
    topic: "optimization",
    title: "Why normalization layers help",
    prompt: [
      "Why can normalization techniques help deep training even when they do not change the task definition?",
    ],
    options: [
      "They can stabilize optimization dynamics and make parameter updates easier to train effectively.",
      "They guarantee zero loss.",
      "They replace activation functions entirely.",
    ],
    answer: 0,
    explanation:
      "Optimization geometry matters. Better-conditioned training can improve stability and speed.",
  },
  {
    id: "evaluation_not_training_loss",
    level: "mid",
    topic: "evaluation",
    title: "Why training loss is not enough",
    prompt: [
      "Why is a low training loss alone not enough to claim the model is good?",
    ],
    options: [
      "Because held-out performance, task metrics, robustness, and deployment behavior may still be poor.",
      "Because training loss is illegal to measure.",
      "Because only UI feedback matters.",
    ],
    answer: 0,
    explanation:
      "Optimization success on the training set is not the same as real task success or generalization.",
  },
  {
    id: "rag_tradeoff",
    level: "senior",
    topic: "llms",
    title: "RAG tradeoff",
    prompt: [
      "A team adds retrieval to improve factual grounding. What is the strongest systems tradeoff to mention?",
    ],
    options: [
      "Retrieval can improve grounding and freshness, but now retrieval quality, indexing, latency, and context-selection errors become part of system behavior.",
      "RAG removes the need for evaluation.",
      "Retrieval makes hallucination impossible.",
    ],
    answer: 0,
    explanation:
      "RAG changes where knowledge comes from and adds new system dependencies, failure modes, and latency considerations.",
  },
  {
    id: "pretrain_vs_finetune",
    level: "senior",
    topic: "llms",
    title: "Pretraining versus fine-tuning",
    prompt: [
      "Why is fine-tuning not a replacement for pretraining?",
    ],
    options: [
      "Fine-tuning adapts an existing representation base, while pretraining is what usually builds broad statistical competence in the first place.",
      "Because fine-tuning only changes UI prompts.",
      "Because pretraining and fine-tuning are mathematically identical terms.",
    ],
    answer: 0,
    explanation:
      "The stages play different roles in capability formation and specialization.",
  },
  {
    id: "serving_batching_tradeoff",
    level: "senior",
    topic: "serving",
    title: "Batching in inference serving",
    prompt: [
      "Why is batching a tradeoff in inference systems rather than an automatic win?",
    ],
    options: [
      "Larger batches can improve throughput, but they may increase queueing delay and hurt tail latency.",
      "Batching changes the model architecture automatically.",
      "Batching only matters for training, never inference.",
    ],
    answer: 0,
    explanation:
      "Serving systems balance hardware efficiency against user-perceived latency.",
  },
  {
    id: "distributed_training_bottleneck",
    level: "senior",
    topic: "training",
    title: "Distributed training bottleneck",
    prompt: [
      "Why can distributed training scale poorly even when more GPUs are added?",
    ],
    options: [
      "Synchronization, communication overhead, optimizer state movement, and input-pipeline limits can dominate scaling.",
      "Because GPUs cannot multiply matrices in parallel.",
      "Because model parameters shrink when devices increase.",
    ],
    answer: 0,
    explanation:
      "More hardware does not erase coordination cost. It often makes it more important.",
  },
  {
    id: "alignment_vs_capability",
    level: "senior",
    topic: "alignment",
    title: "Alignment versus capability",
    prompt: [
      "Why should a strong interview answer distinguish model capability from alignment?",
    ],
    options: [
      "Because being able to produce sophisticated outputs is not the same as reliably producing desirable, safe, or policy-compliant behavior.",
      "Because alignment only matters for image models.",
      "Because capabilities are generated only after deployment.",
    ],
    answer: 0,
    explanation:
      "Capability describes what the model can do. Alignment is about how it behaves relative to goals and constraints.",
  },
  {
    id: "eval_pipeline_reasoning",
    level: "senior",
    topic: "evaluation",
    title: "Why evaluation pipelines matter",
    prompt: [
      "Why is a production AI system incomplete without a serious evaluation pipeline?",
    ],
    options: [
      "Because prompt changes, model changes, retrieval changes, and data drift all need repeatable measurement beyond intuition.",
      "Because evaluation is only for academic papers.",
      "Because benchmark scores make monitoring unnecessary.",
    ],
    answer: 0,
    explanation:
      "Model behavior changes over time and across inputs, so disciplined evaluation is part of the product system, not an optional extra.",
  },
  {
    id: "hallucination_system_view",
    level: "senior",
    topic: "llms",
    title: "Hallucination as a system issue",
    prompt: [
      "Why is hallucination mitigation not just a prompt-writing problem?",
    ],
    options: [
      "Because model limits, retrieval quality, grounding strategy, evaluation, tool use, and product constraints all shape hallucination behavior.",
      "Because hallucination disappears once temperature is zero.",
      "Because only users, not systems, cause hallucinations.",
    ],
    answer: 0,
    explanation:
      "Prompting matters, but reliable behavior usually requires broader system design and measurement.",
  },
];
