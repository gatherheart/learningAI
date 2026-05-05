from __future__ import annotations

import json
import re
import time
from collections import Counter
from datetime import datetime
from pathlib import Path

from deep_translator import GoogleTranslator
from deep_translator.exceptions import RequestError

INPUT = Path("data/tistory_exports/combined_articles.json")
OUTPUTS = [Path("src/data/lessons.json"), Path("public/lessons.json")]
CACHE_PATH = Path("data/tistory_exports/translation_cache.json")


TOPIC_LABELS = {
    "overview": "overview",
    "data": "data foundations",
    "linear_algebra": "linear algebra",
    "probability": "probability and statistics",
    "evaluation": "evaluation",
    "classical_ml": "classical machine learning",
    "clustering": "clustering and representation learning",
    "optimization": "optimization",
    "deep_learning": "deep learning",
    "computer_vision": "computer vision",
    "nlp": "natural language processing",
    "transformers": "sequence models and transformers",
    "llms": "llm systems",
    "recommenders": "recommender systems",
    "time_series": "time series",
    "generative_ai": "generative ai",
    "reinforcement_learning": "reinforcement learning",
}


PHASE_ORDER = {
    "overview": 10,
    "data": 20,
    "linear_algebra": 30,
    "probability": 40,
    "evaluation": 50,
    "classical_ml": 60,
    "clustering": 70,
    "optimization": 80,
    "deep_learning": 90,
    "computer_vision": 100,
    "nlp": 110,
    "transformers": 120,
    "llms": 130,
    "recommenders": 140,
    "time_series": 150,
    "generative_ai": 160,
    "reinforcement_learning": 170,
}


RULES: list[tuple[str, str]] = [
    ("data", r"판다스|데이터를 올바르게 분할|결측치|categorical|Feature engineering|flow_from_directory|ImageDataGenerator|Sampling 기법|텍스트를 이용한 머신러닝 프로세스"),
    ("linear_algebra", r"벡터공간|선형독립|기저벡터|Null Space|Vector space|역행렬|전치행렬|LU Decomposition|SVD|Linear Independence|Subspaces|가우스 소거법|연립방정식|Singular Case"),
    ("optimization", r"Bayesian Optimization|Hyperparameter tuning|Optimization in DNN|Genetic Algorithm|Xaiver|Xavier|He 파라미터 초기화|학습관련 기술들"),
    ("probability", r"엔트로피|Entropy|확률변수|확률밀도함수|누적분포함수|조건부확률|Bayes 정리|표본평균|표본분산|정규 분포|정규분포|베르누이|이항 분포|다항 분포|베타 분포|감마 분포|지수 분포|로그-정규|포아송 분포|카이제곱 분포|t분포|F분포|어랑분포|기하분포|연합분포|컨볼루션|특성함수|Fourier"),
    ("evaluation", r"혼동 행렬|정확도|정밀도|재현율|ROC Curve|Regression metric|Out Of Fold|Cross validation|추천 시스템의 성능|성능 측정 방법|FDR"),
    ("overview", r"머신러닝이란|머신러닝 알고리즘 소개"),
    ("classical_ml", r"Linear Regression|선형회귀|Logistic Regression|로지스틱 함수|소프트맥스 함수|Softmax Regression|SVM|Support Vector Machine|Bayesian Networks|CatBoost|Ensemble|Stacking|Elastic net regression|회귀분석|분류|부스팅"),
    ("clustering", r"클러스터링|Clustering|K-Means|K-means|Spectral Clustering|GMM|Gaussian Mixture|EM Algorithm|PCA|주성분|LDA\(선형판별분석\)|Topic Modeling|Latent Dirichlet Allocation|문서 군집화|similarity"),
    ("deep_learning", r"Perceptron|퍼셉트론|인공신경망|Artificial Neural Network|ANN|Neural Network|오차역전파|수치 미분|계산 그래프|활성화 함수|Deep Neural Network|How to improve Deep Neural Network|Auto Encoder|Fine Tuning|Residual Block"),
    ("computer_vision", r"CNN|Convolutional Neural Network|ResNet|GoogleNet|Inception|Object Detection|RCNN|YOLO|SSD|Retina Net|Mask RCNN|Grad CAM|CAM"),
    ("nlp", r"자연어처리|POS Tagging|품사 태깅|스펠링 체커|문서 분류|감성|Collaborative Filtering\(Recommendation\)|Contents-based Recommendation"),
    ("transformers", r"word2vec|Embedding 계층|RNN LM|순환신경망|LSTM|GRU|seq2seq|Attention|어텐션|Transformer|BERT"),
    ("llms", r"\[LLM\]|GPT-1|GPT-2|GPT-3|temperature|LangChain|RAG|Whisper|LangGraph|multi AI Agent"),
    ("recommenders", r"추천시스템|Recommendation|Factorization Machine|Deep FM|Neural CF|Wide & Deep|Cold Start"),
    ("time_series", r"Time-Series|시계열|ARIMA|SARIMA|ARMA|AutoRegressive|Moving Average|Window Dataset|Box-Jenkins"),
    ("generative_ai", r"GenAI|GAN|WGAN|VAE|CycleGAN|Style Transfer"),
    ("reinforcement_learning", r"강화학습|Q-learning|Q-Network|DQN|Markov Decision Process|마르코프 결정 과정"),
]


TOPIC_BRIDGES = {
    "overview": "This lesson belongs at the start of the track because it defines the vocabulary and problem framing that later mathematical and modeling lessons will assume without reintroducing.",
    "data": "This lesson bridges abstract ML ideas to the concrete data structures, preprocessing decisions, and split discipline that make those ideas executable in practice.",
    "linear_algebra": "This lesson fills the gap between intuitive model talk and the matrix-vector language used by modern ML implementations.",
    "probability": "This lesson fills the gap between raw data patterns and the probabilistic assumptions used to quantify uncertainty, likelihood, and statistical evidence.",
    "evaluation": "This lesson explains how to measure whether a model is useful, separating optimization progress from trustworthy validation and test-time judgment.",
    "classical_ml": "This lesson turns the mathematical foundations into concrete supervised learning algorithms and model-family tradeoffs.",
    "clustering": "This lesson extends the curriculum from supervised prediction into unsupervised structure discovery, representation reduction, and latent grouping.",
    "optimization": "This lesson bridges model definition and reliable training by focusing on search, tuning, initialization, and update strategy.",
    "deep_learning": "This lesson moves from classical feature-based modeling into learned representations, gradient flow, and neural network construction.",
    "computer_vision": "This lesson applies deep learning ideas to spatial data, where locality, receptive fields, and detection metrics become central.",
    "nlp": "This lesson grounds language tasks in token-level structure, symbolic baselines, and practical text-processing pipelines before larger sequence models.",
    "transformers": "This lesson climbs from embeddings and recurrent sequence models into attention and transformer-era representation learning.",
    "llms": "This lesson bridges transformer internals to real modern LLM behavior, product patterns, and system design choices.",
    "recommenders": "This lesson applies representation learning and ranking ideas to user-item interaction modeling and recommendation tradeoffs.",
    "time_series": "This lesson adds temporal dependence, ordering, and forecast-specific evaluation concerns on top of the core ML toolkit.",
    "generative_ai": "This lesson shifts focus from prediction to data-generation objectives, latent-variable modeling, and distribution learning.",
    "reinforcement_learning": "This lesson extends the track from static prediction into sequential decision making under delayed reward.",
}


TOPIC_QUIZZES = {
    "overview": (
        "Why is this material placed at the beginning of the curriculum?",
        [
            "Because later lessons assume these definitions, distinctions, and problem types already make sense.",
            "Because introductory lessons are only for UI testing.",
            "Because overview topics replace the need for math and experiments.",
        ],
        [
            "Correct. Foundational vocabulary and problem framing prevent confusion later.",
            "The ordering is pedagogical, not cosmetic.",
            "Overview helps, but it does not eliminate the need for technical depth.",
        ],
        "A course that jumps into models without a shared vocabulary usually creates fake familiarity instead of understanding.",
        "What should you take away from this lesson before moving on?",
        [
            "A mental map of the problem space and the major kinds of techniques that will appear later.",
            "A belief that all AI methods are interchangeable.",
            "A rule that only one algorithm family matters.",
        ],
        [
            "Correct. The goal is orientation and scope, not premature specialization.",
            "Different problem families demand different tools.",
            "The curriculum intentionally expands across multiple families.",
        ],
        "The point here is to organize the landscape so later details attach to the right concepts.",
    ),
    "data": (
        "What is the main practical value of this data-focused lesson?",
        [
            "It makes model ideas executable by showing how data is structured, cleaned, split, or encoded before learning starts.",
            "It proves data quality never matters once the model is large enough.",
            "It replaces the need for evaluation.",
        ],
        [
            "Correct. Real ML systems fail quickly when data handling is sloppy.",
            "Model capacity does not erase bad inputs.",
            "Evaluation still matters after preprocessing.",
        ],
        "Many production failures come from data assumptions, not from the headline model architecture.",
        "Why does this lesson usually come before advanced modeling?",
        [
            "Because even advanced models inherit whatever signal, leakage, or bias the dataset pipeline provides.",
            "Because preprocessing is only relevant for spreadsheets.",
            "Because data work happens after deployment, not before training.",
        ],
        [
            "Correct. The training signal is only as good as the pipeline that created it.",
            "These decisions matter for text, images, audio, and tabular data alike.",
            "Data pipeline decisions shape training from the start.",
        ],
        "A clean modeling stack cannot rescue a broken data-generation process.",
    ),
    "linear_algebra": (
        "Why is linear algebra unavoidable in ML?",
        [
            "Because features, weights, activations, and transformations are naturally expressed as vectors, matrices, and linear maps.",
            "Because it only matters for physics simulations.",
            "Because modern models no longer use matrix operations.",
        ],
        [
            "Correct. Linear algebra is the operational language of model computation.",
            "Its relevance is much broader than physics.",
            "Modern ML systems are saturated with matrix operations.",
        ],
        "This is the bridge from qualitative intuition to the actual computational objects models manipulate.",
        "What skill should you gain from this lesson?",
        [
            "The ability to read model equations and code as transformations over spaces, dimensions, and basis representations.",
            "A habit of ignoring dimensions and hoping operations work out.",
            "A belief that matrices only exist in textbook proofs.",
        ],
        [
            "Correct. You want to reason about structure, not memorize isolated formulas.",
            "Dimension discipline is core to debugging.",
            "ML code uses these ideas constantly.",
        ],
        "Shape reasoning and linear transformation intuition pay off repeatedly in later lessons.",
    ),
    "probability": (
        "Why does this probability lesson matter for later ML work?",
        [
            "Because uncertainty, likelihood, sampling, and noise assumptions show up across training, inference, and evaluation.",
            "Because probability only matters for casino simulations.",
            "Because models stop using distributions once they become deep.",
        ],
        [
            "Correct. Probabilistic thinking remains central even in large neural systems.",
            "The topic is far broader than games of chance.",
            "Deep models still rely on uncertainty and distribution assumptions.",
        ],
        "This is how the curriculum fills the gap between raw observations and principled reasoning about uncertainty.",
        "What should you retain from this lesson?",
        [
            "A clearer sense of what random variables or distributions are modeling and when their assumptions are useful.",
            "A rule that all real data follows the same distribution.",
            "A belief that probability can be skipped if metrics look good once.",
        ],
        [
            "Correct. The target is modeling judgment, not blind formula memorization.",
            "Different problems call for different assumptions.",
            "Metrics without probabilistic interpretation can still mislead you.",
        ],
        "Good ML work depends on matching assumptions to the data-generating process.",
    ),
    "evaluation": (
        "What is the core purpose of this evaluation lesson?",
        [
            "To separate apparent model performance from trustworthy performance by choosing metrics and validation procedures carefully.",
            "To replace training with reporting.",
            "To prove one metric is always enough.",
        ],
        [
            "Correct. Evaluation guards against self-deception.",
            "Evaluation complements training; it does not replace it.",
            "Different tasks require different measurements.",
        ],
        "Without evaluation discipline, optimization can look impressive while generalization remains weak.",
        "Why is this material placed before more advanced system design?",
        [
            "Because later architectural choices still need a reliable signal for comparison and model selection.",
            "Because metrics only matter for final slide decks.",
            "Because evaluation happens only after a product ships.",
        ],
        [
            "Correct. Design tradeoffs need a trustworthy yardstick.",
            "Metrics are operational tools, not just presentation artifacts.",
            "Evaluation should influence decisions well before shipping.",
        ],
        "A sophisticated system without sound evaluation is hard to trust or improve.",
    ),
    "classical_ml": (
        "What is the main role of this classical ML lesson in the track?",
        [
            "It shows how mathematical assumptions turn into concrete algorithm families for prediction and classification.",
            "It exists only for historical interest.",
            "It means neural networks are unnecessary in every setting.",
        ],
        [
            "Correct. This is where theory becomes concrete supervised modeling practice.",
            "These methods remain useful, not merely historical.",
            "The point is comparison and scope, not exclusivity.",
        ],
        "Classical ML is often the cleanest place to see bias-variance, feature effects, and decision boundaries clearly.",
        "What should you leave this lesson understanding better?",
        [
            "How the algorithm family behaves, what assumptions it makes, and what kinds of data or tasks it suits.",
            "That every dataset should use the same model.",
            "That training data quality no longer matters once an algorithm is chosen.",
        ],
        [
            "Correct. Model choice is about fit between assumptions and task structure.",
            "Model selection is contextual.",
            "Data quality remains central regardless of the algorithm.",
        ],
        "The goal is decision quality, not brand loyalty to a model family.",
    ),
    "clustering": (
        "Why is this unsupervised-learning lesson important?",
        [
            "It teaches how to discover latent structure when labels are missing or when lower-dimensional structure matters.",
            "It guarantees every dataset has one correct cluster count.",
            "It replaces evaluation with visualization alone.",
        ],
        [
            "Correct. Unsupervised methods are about structure discovery, not only prediction.",
            "Cluster structure is rarely that simple.",
            "Visualization helps, but it is not enough by itself.",
        ],
        "This section fills the gap between supervised targets and exploratory structure learning.",
        "What is the right mindset for these methods?",
        [
            "Treat them as tools for structure discovery whose usefulness depends on assumptions, distance choices, and downstream goals.",
            "Assume unsupervised output is automatically ground truth.",
            "Ignore preprocessing because labels are absent.",
        ],
        [
            "Correct. Interpretation depends heavily on assumptions and use case.",
            "Unsupervised output still needs scrutiny.",
            "Preprocessing and representation still matter a great deal.",
        ],
        "Unsupervised learning is powerful, but it is easy to over-interpret if you skip assumption checks.",
    ),
    "optimization": (
        "What gap does this optimization lesson fill?",
        [
            "It explains how models are actually trained or tuned once the objective exists.",
            "It proves architecture no longer matters.",
            "It exists only to increase compute cost.",
        ],
        [
            "Correct. Defining a model is different from training it well.",
            "Architecture and optimization interact rather than replacing each other.",
            "The point is training quality and efficiency.",
        ],
        "Good ideas can underperform badly without good optimization and tuning decisions.",
        "What should you learn to watch for here?",
        [
            "Stability, search strategy, initialization, and whether the optimization signal actually supports the result you want.",
            "Only the final training loss value.",
            "Nothing except the number of GPUs used.",
        ],
        [
            "Correct. The training path matters, not just the endpoint number.",
            "One scalar rarely tells the whole story.",
            "Hardware matters, but it is not the conceptual core.",
        ],
        "Optimization is where many subtle failures emerge long before deployment.",
    ),
    "deep_learning": (
        "Why is this lesson part of the deep-learning phase?",
        [
            "Because it focuses on learned representations, gradient-based training, and layered function composition.",
            "Because deep learning removes the need for optimization.",
            "Because neural networks only matter for image tasks.",
        ],
        [
            "Correct. Representation learning and gradient flow are the central shift here.",
            "Optimization remains essential.",
            "Neural models apply far beyond images.",
        ],
        "This stage bridges classical algorithms and representation-learning systems.",
        "What should you carry forward from this lesson?",
        [
            "An understanding of how parameters, activations, gradients, or network components interact during learning.",
            "A belief that bigger models automatically solve every task.",
            "A habit of ignoring initialization and training dynamics.",
        ],
        [
            "Correct. Internal training behavior matters as much as model capacity.",
            "Scale helps, but it is not magic.",
            "Those dynamics strongly affect whether learning works at all.",
        ],
        "Neural-network intuition comes from understanding training mechanics, not from memorizing model names.",
    ),
    "computer_vision": (
        "What makes this lesson specifically computer-vision oriented?",
        [
            "It deals with spatial structure, visual features, and vision-specific architectures or metrics.",
            "It is just a rebranded text model lesson.",
            "It assumes images contain no local structure.",
        ],
        [
            "Correct. Vision work depends on locality, hierarchy, and spatial reasoning.",
            "Vision has distinct modeling assumptions.",
            "Local structure is one of the main reasons CNN-style ideas work.",
        ],
        "This section shows how general deep-learning ideas adapt to image structure and detection objectives.",
        "What should you be learning to reason about here?",
        [
            "How representation scale, receptive fields, localization, and vision metrics change model design choices.",
            "Only how to resize images.",
            "Why evaluation is unnecessary for vision systems.",
        ],
        [
            "Correct. Spatial reasoning drives architecture and evaluation here.",
            "Preprocessing is only a tiny part of the story.",
            "Evaluation is especially important for visual tasks.",
        ],
        "Vision models are not just bigger neural nets; the structure of the data changes the design space.",
    ),
    "nlp": (
        "Why keep these classical NLP lessons before or alongside larger language models?",
        [
            "Because token-level tasks, symbolic baselines, and text pipelines clarify what modern models are replacing or generalizing.",
            "Because modern language models never touch tokens.",
            "Because linguistic structure stopped mattering after transformers arrived.",
        ],
        [
            "Correct. Classical NLP gives interpretable anchors for later sequence models.",
            "Tokenization remains fundamental.",
            "Linguistic structure still matters, even if the modeling machinery changed.",
        ],
        "This phase fills the gap between generic ML and language-specific supervision or tagging tasks.",
        "What should you leave this lesson with?",
        [
            "A better sense of how text becomes features, labels, and sequence-structured prediction problems.",
            "A belief that every text task is just a prompt.",
            "A rule that handcrafted features always beat learned representations.",
        ],
        [
            "Correct. The important step is understanding the problem structure.",
            "Prompting is only one part of the NLP landscape.",
            "The curriculum compares methods rather than declaring a universal winner.",
        ],
        "Language modeling becomes easier to reason about when you first understand the simpler task formulations.",
    ),
    "transformers": (
        "Why is this material a separate phase from basic NLP?",
        [
            "Because it focuses on learned sequence representations, attention, and the path from recurrent models to transformers.",
            "Because sequence modeling can ignore token representations.",
            "Because transformer-era methods do not depend on embeddings or context.",
        ],
        [
            "Correct. This is the architectural bridge into modern language modeling.",
            "Representations remain central.",
            "Context handling is one of the main reasons these models matter.",
        ],
        "This section explains the ladder from embeddings and recurrent memory to attention-driven sequence modeling.",
        "What should you carry into later LLM lessons?",
        [
            "An intuition for how sequence context is encoded, updated, and selectively attended to.",
            "A belief that all sequence models work the same way.",
            "A rule that recurrence and attention are identical ideas.",
        ],
        [
            "Correct. Later LLM behavior only makes sense if the sequence-modeling machinery is clear.",
            "Different sequence families make different tradeoffs.",
            "They solve related problems with distinct mechanisms.",
        ],
        "Transformer intuition is much stronger when you understand the models it replaced and generalized.",
    ),
    "llms": (
        "What does this LLM-focused lesson add beyond transformer internals?",
        [
            "It connects architecture to real system behavior such as prompting, retrieval, serving, agent workflows, or model parameters.",
            "It claims architecture no longer matters at all.",
            "It says all LLM products are identical once they generate text.",
        ],
        [
            "Correct. This phase is about practical LLM behavior and system design.",
            "Internals still matter.",
            "Product behavior depends heavily on design choices.",
        ],
        "This phase fills the gap between model mechanics and deployable LLM systems.",
        "What should you take away from this lesson?",
        [
            "A clearer picture of how model behavior, retrieval, prompting, latency, and tooling interact in real applications.",
            "A belief that prompts are the only thing that matters.",
            "A rule that external tools or retrieval always make answers correct.",
        ],
        [
            "Correct. Real LLM systems are pipelines, not just raw models.",
            "Prompting is only one lever.",
            "External context helps, but it still needs careful integration and verification.",
        ],
        "Later deployment quality depends on understanding the model-plus-system boundary.",
    ),
    "recommenders": (
        "Why does recommendation deserve its own section?",
        [
            "Because ranking user-item interactions involves feedback loops, sparse signals, and objective tradeoffs that differ from plain classification.",
            "Because recommenders are just image classifiers with a new name.",
            "Because user behavior never changes after training.",
        ],
        [
            "Correct. Recommendation is its own modeling and evaluation problem.",
            "The structure is different.",
            "Behavior drift is one of the central challenges.",
        ],
        "This section applies ML ideas to ranking, preference estimation, and sparse interaction data.",
        "What should you keep in mind while reading these lessons?",
        [
            "That feedback data is biased, sparse, and tightly connected to evaluation and product behavior.",
            "That recommendation quality can be judged by one metric alone.",
            "That user and item representations never need updating.",
        ],
        [
            "Correct. Recommendation systems are dynamic sociotechnical systems, not just static predictors.",
            "Ranking systems usually need multiple views of quality.",
            "Representations and policies often need ongoing refresh.",
        ],
        "Recommendation lessons are about tradeoffs in signal, bias, and ranking behavior.",
    ),
    "time_series": (
        "What makes time-series modeling different from ordinary tabular prediction?",
        [
            "The order of observations matters, so leakage, lag structure, seasonality, and forecast horizon become central.",
            "Time order can be safely shuffled away.",
            "Forecasting never needs specialized validation.",
        ],
        [
            "Correct. Temporal dependence changes both modeling and evaluation.",
            "Shuffling often destroys the signal you are trying to model.",
            "Time-aware validation is a major concern.",
        ],
        "This section fills the gap between generic supervised learning and temporally dependent forecasting problems.",
        "What should you learn to watch for here?",
        [
            "How temporal structure changes features, decomposition, backtesting, and model assumptions.",
            "Only the final point forecast.",
            "A rule that one forecasting family dominates every time-series problem.",
        ],
        [
            "Correct. Temporal modeling is about structure, not just point estimates.",
            "A single number rarely communicates forecast quality fully.",
            "Different processes require different assumptions.",
        ],
        "Time-series reasoning lives or dies on respecting temporal order and dependency.",
    ),
    "generative_ai": (
        "What is the conceptual shift in this generative-AI lesson?",
        [
            "The objective changes from only predicting labels to modeling or sampling from the data-generating distribution.",
            "Generative models never use latent structure.",
            "Generation means evaluation no longer matters.",
        ],
        [
            "Correct. Generative modeling is about learning how data could have been produced.",
            "Latent structure is often central.",
            "Evaluation remains important, even if it is harder.",
        ],
        "This phase bridges discriminative modeling and distribution-learning objectives.",
        "What should you be learning to reason about here?",
        [
            "How latent variables, adversarial objectives, or reconstruction losses change what the model is optimizing for.",
            "Only how to make prettier output images.",
            "Why probability assumptions disappear in generative settings.",
        ],
        [
            "Correct. Objective design is the core conceptual shift.",
            "Surface output quality is not the whole story.",
            "Generative models are still deeply tied to probability and distributional thinking.",
        ],
        "Generative systems are best understood through objective functions and sampling behavior, not just demos.",
    ),
    "reinforcement_learning": (
        "What makes reinforcement learning fundamentally different here?",
        [
            "The model must learn from sequential interaction and delayed reward rather than only from static supervised targets.",
            "It eliminates uncertainty from decision making.",
            "It reduces every problem to one-step classification.",
        ],
        [
            "Correct. Credit assignment over time is the defining challenge.",
            "RL is full of uncertainty.",
            "Sequential dependence is the main distinction.",
        ],
        "This section fills the gap between passive prediction and decision-making under feedback.",
        "What should you leave this lesson understanding better?",
        [
            "How state, action, reward, and value concepts reshape the learning problem.",
            "That supervised loss functions are enough to explain every RL setting.",
            "That exploration is optional in sequential decision making.",
        ],
        [
            "Correct. RL changes the structure of the objective itself.",
            "Supervised intuition helps, but it is incomplete here.",
            "Exploration is a central concern.",
        ],
        "RL requires a different mental model because the learner influences the data it will later observe.",
    ),
}


TOPIC_CODE = {
    "overview": ("problems = ['regression', 'classification', 'clustering']\nprint(len(problems))\nprint(problems[0])", "3\nregression"),
    "data": ("rows = [{'split': 'train'}, {'split': 'train'}, {'split': 'test'}]\ntrain_rows = sum(1 for row in rows if row['split'] == 'train')\nprint(train_rows)", "2"),
    "linear_algebra": ("vector = [2, 3]\nweights = [4, 5]\ndot = vector[0] * weights[0] + vector[1] * weights[1]\nprint(dot)", "23"),
    "probability": ("successes = 3\ntrials = 5\nprint(round(successes / trials, 2))", "0.6"),
    "evaluation": ("tp, fp, fn = 8, 2, 1\nprecision = tp / (tp + fp)\nrecall = tp / (tp + fn)\nprint(round(precision, 3))\nprint(round(recall, 3))", "0.8\n0.889"),
    "classical_ml": ("weights = [0.4, 1.2]\nfeatures = [3.0, 2.0]\nscore = weights[0] * features[0] + weights[1] * features[1]\nprint(round(score, 1))", "3.6"),
    "clustering": ("point = (2, 1)\ncenter_a = (0, 0)\ncenter_b = (4, 1)\ndist_a = abs(point[0] - center_a[0]) + abs(point[1] - center_a[1])\ndist_b = abs(point[0] - center_b[0]) + abs(point[1] - center_b[1])\nprint('A' if dist_a < dist_b else 'B')", "A"),
    "optimization": ("weight = 1.5\ngrad = -0.4\nlr = 0.1\nweight = weight - lr * grad\nprint(round(weight, 2))", "1.54"),
    "deep_learning": ("x = -2\nrelu = max(0, x)\nprint(relu)", "0"),
    "computer_vision": ("image = [[1, 2], [3, 4]]\nprint(image[0][1] + image[1][0])", "5"),
    "nlp": ("text = 'part of speech'\ntokens = text.split()\nprint(len(tokens))\nprint(tokens[-1])", "3\nspeech"),
    "transformers": ("query = [1, 2]\nkey = [2, 1]\nscore = query[0] * key[0] + query[1] * key[1]\nprint(score)", "4"),
    "llms": ("logits = [1.0, 2.0]\nimport math\nvalues = [math.exp(x) for x in logits]\nprob = values[1] / sum(values)\nprint(round(prob, 3))", "0.731"),
    "recommenders": ("user = [0.8, 0.2]\nitem = [0.5, 0.9]\nscore = user[0] * item[0] + user[1] * item[1]\nprint(round(score, 2))", "0.58"),
    "time_series": ("series = [10, 12, 13, 15]\nlag_1 = series[-2]\nprint(lag_1)", "13"),
    "generative_ai": ("latent = [0.2, 0.8]\nprint(round(sum(latent), 1))", "1.0"),
    "reinforcement_learning": ("q = 0.5\nreward = 1.0\nnext_best = 0.8\nalpha = 0.1\ngamma = 0.9\nq = q + alpha * (reward + gamma * next_best - q)\nprint(round(q, 3))", "0.622"),
}


def load_cache() -> dict[str, str]:
    if CACHE_PATH.exists():
        return json.loads(CACHE_PATH.read_text(encoding="utf-8"))
    return {}


def save_cache(cache: dict[str, str]) -> None:
    CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
    CACHE_PATH.write_text(json.dumps(cache, ensure_ascii=False, indent=2), encoding="utf-8")


TRANSLATOR = GoogleTranslator(source="ko", target="en")
TRANSLATION_CACHE = load_cache()


def translate_chunk(text: str) -> str:
    text = text.strip()
    if not text:
        return ""
    cache_key = f"chunk::{text}"
    if cache_key in TRANSLATION_CACHE:
        return TRANSLATION_CACHE[cache_key]
    translated = None
    for attempt in range(5):
        try:
            translated = TRANSLATOR.translate(text)
            time.sleep(0.15)
            break
        except RequestError:
            if attempt == 4:
                break
            time.sleep(1.5 * (attempt + 1))
    if translated is None:
        if len(text) <= 600:
            raise RequestError()
        midpoint = len(text) // 2
        split_index = text.rfind("\n", 0, midpoint)
        if split_index == -1:
            split_index = text.rfind(". ", 0, midpoint)
        if split_index == -1:
            split_index = midpoint
        left = translate_chunk(text[:split_index])
        right = translate_chunk(text[split_index:])
        translated = f"{left}\n{right}".strip()
    TRANSLATION_CACHE[cache_key] = translated
    save_cache(TRANSLATION_CACHE)
    return translated


def translate_text(text: str, *, chunk_size: int = 1800) -> str:
    text = text.strip()
    if not text:
        return ""
    cache_key = f"text::{text}"
    if cache_key in TRANSLATION_CACHE:
        return TRANSLATION_CACHE[cache_key]

    pieces: list[str] = []
    current: list[str] = []
    current_len = 0

    for line in text.splitlines():
        line = line.rstrip()
        if not line:
            if current:
                pieces.append("\n".join(current))
                current = []
                current_len = 0
            pieces.append("")
            continue

        if len(line) > chunk_size:
            if current:
                pieces.append("\n".join(current))
                current = []
                current_len = 0
            start = 0
            while start < len(line):
                pieces.append(line[start:start + chunk_size])
                start += chunk_size
            continue

        added = len(line) + (1 if current else 0)
        if current and current_len + added > chunk_size:
            pieces.append("\n".join(current))
            current = [line]
            current_len = len(line)
        else:
            current.append(line)
            current_len += added

    if current:
        pieces.append("\n".join(current))

    translated_parts = []
    for piece in pieces:
        if piece == "":
            translated_parts.append("")
        else:
            translated_parts.append(translate_chunk(piece))

    translated = "\n\n".join(part for part in translated_parts)
    translated = re.sub(r"\n{3,}", "\n\n", translated).strip()
    TRANSLATION_CACHE[cache_key] = translated
    save_cache(TRANSLATION_CACHE)
    return translated


def parse_date(value: str) -> datetime:
    if not value:
        return datetime.min
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def sequence_hint(title: str) -> int:
    match = re.search(r"\((\d+)\)", title)
    if match:
        return int(match.group(1))
    match = re.search(r"[-:]?\s*(\d+)\.\s", title)
    if match:
        return int(match.group(1))
    return 999


def specific_rank(title: str, topic: str) -> int:
    title_lower = title.lower()
    ordered_patterns = {
        "overview": [
            r"인공지능", r"머신러닝이란", r"머신러닝 알고리즘 소개",
        ],
        "data": [
            r"판다스", r"프로세스", r"분할", r"결측치", r"categorical", r"feature engineering", r"sampling", r"imagegenerator",
        ],
        "linear_algebra": [
            r"vector space|벡터공간", r"subspaces|부벡터공간", r"linear independence|선형독립", r"basis|기저벡터", r"null space", r"역행렬|전치행렬", r"lu decomposition", r"svd",
        ],
        "probability": [
            r"확률변수.*cdf|누적분포함수", r"연속확률변수|확률밀도함수", r"평균과 분산", r"조건부확률|bayes", r"bernoulli|베르누이", r"binomial|이항", r"multinomial|다항", r"poisson|포아송", r"exponential|지수", r"gamma|감마", r"beta|베타", r"normal|정규", r"log-normal|로그-정규", r"카이제곱|t분포|f분포", r"convolution|컨볼루션", r"fourier|특성함수", r"entropy|엔트로피",
        ],
        "evaluation": [
            r"혼동 행렬|정확도|정밀도|재현율", r"precision.*recall|roc", r"regression metric", r"out of fold", r"cross validation", r"성능.*평가|성능 측정",
        ],
        "classical_ml": [
            r"linear regression", r"logistic regression|로지스틱 함수", r"softmax", r"svm", r"ensemble", r"catboost", r"bayesian network",
        ],
        "clustering": [
            r"clustering.*model|클러스터링", r"k-means", r"dbscan|mean shift|silhouette", r"gmm|gaussian mixture", r"em algorithm", r"spectral", r"pca", r"lda", r"topic modeling",
        ],
        "optimization": [
            r"학습관련 기술", r"xavier|he", r"hyperparameter", r"bayesian optimization", r"genetic algorithm",
        ],
        "deep_learning": [
            r"perceptron|퍼셉트론", r"ann|인공신경망", r"간단한 신경망", r"수치 미분", r"오차역전파", r"활성화 함수", r"학습 구현", r"deep neural network", r"improve deep neural network", r"fine tuning",
        ],
        "computer_vision": [
            r"cnn", r"resnet", r"inception|googlenet", r"object detection 기초", r"rcnn", r"fast rcnn", r"faster rcnn", r"ssd", r"yolo", r"retina", r"mask rcnn", r"cam|grad cam",
        ],
        "nlp": [
            r"텍스트를 이용한 머신러닝 프로세스", r"spelling", r"규칙기반 품사 태깅", r"통계기반 품사 태깅", r"hmm", r"crf", r"bilstm|양방향 lstm", r"transformer 모델 구현",
        ],
        "transformers": [
            r"word2vec", r"embedding", r"rnn", r"lstm", r"gru", r"seq2seq", r"attention|어텐션", r"transformer", r"bert",
        ],
        "llms": [
            r"gpt-1|gpt-2|gpt-3", r"temperature", r"rag", r"whisper", r"langgraph|multi ai agent",
        ],
        "recommenders": [
            r"collaborative filtering", r"contents-based", r"factorization machine", r"neural cf", r"wide & deep", r"deep fm", r"cold start", r"성능.*평가",
        ],
        "time_series": [
            r"특징과 모형", r"분해법", r"analysis|예측방법", r"ar\(autoregressive\)", r"box-jenkins", r"arima|sarima", r"window dataset",
        ],
        "generative_ai": [
            r"생성 모델링", r"ae|vae", r"gan|wgan", r"cyclegan|style transfer",
        ],
        "reinforcement_learning": [
            r"markov decision process|마르코프", r"q-learning|dqn|q-network",
        ],
    }
    for index, pattern in enumerate(ordered_patterns.get(topic, [])):
        if re.search(pattern, title_lower, re.I):
            return index
    return 999


def classify_topic(article: dict[str, str]) -> str:
    title = article["title"]
    for topic, pattern in RULES:
        if re.search(pattern, title, re.I):
            return topic
    if "ChatGPT/인공지능" in article["category"]:
        return "overview"
    if "machine learning" in article["category"].lower():
        return "llms" if re.search(r"llm|gpt|bert|transformer|rag|langchain|langgraph", title, re.I) else "classical_ml"
    return "classical_ml"


def bayesian_gap_fill(title: str) -> str:
    if re.search(r"조건부확률|Bayes", title, re.I):
        return (
            "This lesson also carries the missing Bayesian-inference ladder that the source corpus does not state explicitly enough. "
            "Read Bayes' rule here not only as a conditional-probability identity, but as the update mechanism behind Bayesian modeling: "
            "posterior is proportional to likelihood times prior. "
            "A prior encodes what was plausible before observing the current dataset, the likelihood encodes how the data would be generated under a candidate parameter value, "
            "and the posterior redistributes belief toward values better supported by the evidence. "
            "This is the conceptual bridge from probability formulas to Bayesian models."
        )
    if re.search(r"Bayesian Networks|베이즈 네트워크", title, re.I):
        return (
            "This lesson is extended to cover Bayesian models more broadly, not just Bayesian networks. "
            "A Bayesian model specifies latent variables or parameters, priors over them, a likelihood relating them to observations, and an inference procedure for approximating the posterior. "
            "Bayesian networks are one graphical-model instance of that broader family. "
            "Naive Bayes, Bayesian linear regression, and hierarchical Bayesian models all fit this pattern. "
            "The key question is always the same: what uncertainties are being modeled, what conditional dependencies are assumed, and what posterior object do we want to reason about after seeing data?"
        )
    if re.search(r"Bayesian Optimization", title, re.I):
        return (
            "This lesson is also extended with the missing MCMC process, because many Bayesian workflows need approximate posterior inference even when Bayesian optimization itself does not always use MCMC directly. "
            "Markov Chain Monte Carlo constructs a Markov chain whose stationary distribution is the target posterior, allowing you to sample from complex posterior landscapes when closed-form inference is unavailable. "
            "The practical workflow is: initialize a state, propose a new state, compute an acceptance ratio, accept or reject, repeat, discard burn-in, and diagnose mixing and convergence. "
            "This matters because Bayesian optimization, Bayesian networks, and probabilistic models are easier to understand when you separate optimization over an acquisition function from sampling-based posterior inference. "
            "Optimization searches for a good point; MCMC tries to preserve the full uncertainty distribution."
        )
    return (
        "This lesson is expanded only where the original source leaves conceptual jumps. "
        "The goal is to keep the original material intact while filling prerequisite gaps inside the same lesson rather than creating a separate section."
    )


def supplemental_note(title: str) -> str:
    if re.search(r"Multivariate regression|Linear Regression|Logistic Regression", title, re.I):
        return "\n".join(
            [
                "Integrated note from the provided regression material:",
                "Multiple regression models a dependent variable as `Y_i = b0 + b1 X1 + ... + bn Xn + e`, where the residual is actual `Y` minus predicted `Y`.",
                "Core assumptions are linearity between dependent and independent variables, normally distributed residuals, constant error variance, residual independence across samples, and no harmful dependence structure among predictors across samples.",
                "A coefficient p-value tests the null hypothesis that a slope coefficient is zero, meaning that predictor has no effect on the target. A small p-value means the observed coefficient would be difficult to explain as random noise under that null.",
                "For model comparison, `AIC` is treated as a forecasting-oriented criterion and lower is better, while `BIC` imposes a stronger complexity penalty and is often used as a stricter fit-versus-parsimony criterion.",
                "Restricted versus unrestricted model testing asks whether some coefficients can be set to zero without materially harming explanatory power; this is where F-tests naturally appear.",
                "Misspecification risks include omitted important variables, choosing the wrong functional form such as linear versus log-linear, poor scaling or transformation choices, and improperly pooled data.",
                "Those mistakes can lead to biased or inconsistent estimates, heteroskedasticity, serial correlation, or multicollinearity.",
                "Multicollinearity means predictors are too correlated with one another, inflating standard errors and making slope estimates unstable. A common diagnostic is VIF, where high values indicate a serious problem.",
                "Heteroskedasticity means residual variance changes across observations; visual residual plots and tests such as Breusch-Pagan are standard checks.",
                "Serial correlation means residuals are correlated over time, especially in time-series regressions, which can make p-values look too optimistic and distort significance claims. Durbin-Watson and Breusch-Godfrey are common diagnostics.",
                "Outliers and high-leverage points must be treated separately: not every unusual observation is influential, but influential observations can distort slope estimates and inference.",
                "For binary outcomes, logistic regression replaces direct linear prediction of probability with a log-odds model. If a predictor increases by one unit, the log-odds move linearly even though the resulting probability changes nonlinearly through the logistic function.",
            ]
        )
    if re.search(r"Time-Series|ARIMA|SARIMA|AutoRegressive|ARMA|decomposition", title, re.I):
        return "\n".join(
            [
                "Integrated note from the provided time-series material:",
                "Start by deciding whether the goal is explaining `Y` with other variables, modeling time as the main driver, or forecasting a series from its own lagged behavior.",
                "Before choosing a model, inspect the series for non-stationarity, changing variance, changing mean, seasonality, or structural breaks.",
                "If the process grows by a constant amount, a linear trend model is natural. If it grows by a constant rate, a log-linear trend is usually more appropriate.",
                "After fitting a trend model, test residuals for serial correlation. If residuals are still autocorrelated, autoregressive structure is missing and an AR-style model may be needed.",
                "An AR model uses lagged values such as `X_(t-1)` to explain the current value `X_t`. This only makes sense if the process is covariance-stationary: constant mean, finite variance, and time-invariant covariance structure.",
                "If the series has a unit root, it behaves like a random walk and is non-stationary. The Dickey-Fuller family of tests checks that null. First differencing is the standard repair when a unit root is present.",
                "If differencing produces a stationary series, autoregressive modeling becomes more defensible. If seasonality remains, seasonal terms or seasonal differencing must be considered.",
                "ARCH effects mean the variance of the error term changes over time as a function of past errors. Ignoring ARCH can invalidate standard OLS-style inference even when the mean equation looks reasonable.",
                "This note also ties the regression diagnostics back to time series: heteroskedasticity, serial correlation, and model misspecification are not isolated pathologies. They are often the reason a trend or ARIMA-family model fails to produce trustworthy inference or forecasting performance.",
            ]
        )
    return ""


def extract_outline(content: str, limit: int = 18) -> list[str]:
    outline: list[str] = []
    seen: set[str] = set()
    for raw_line in content.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        if len(line) > 90:
            continue
        if line in seen:
            continue
        seen.add(line)
        outline.append(line)
        if len(outline) >= limit:
            break
    return outline


def extract_lead_paragraphs(content: str, limit: int = 6) -> str:
    paragraphs = [part.strip() for part in re.split(r"\n\s*\n", content) if part.strip()]
    cleaned: list[str] = []
    for para in paragraphs:
        if len(para) < 40:
            continue
        cleaned.append(para)
        if len(cleaned) >= limit:
            break
    return "\n\n".join(cleaned)


def build_description(article: dict[str, str], topic: str) -> str:
    translated_blog_title = translate_text(article["blog_title"])
    translated_title = translate_text(article["title"])
    translated_outline = translate_text("\n".join(extract_outline(article["content_text"])))
    translated_lead = translate_text(extract_lead_paragraphs(article["content_text"]))
    lines = [
        f"Source article: `{translated_title}`",
        f"Source blog: `{translated_blog_title}`",
        f"Source URL: `{article['url']}`",
        "",
        "Why this lesson appears here:",
        TOPIC_BRIDGES[topic],
        "",
        "Knowledge bridge:",
        "If the original article jumps directly into procedures or formulas, treat this lesson as both a preserved source note and a guided connection to the surrounding curriculum. Read the source details, then link them back to the core question of what assumptions, representations, or evaluation criteria make the method work.",
        "",
        "Expanded coverage:",
        bayesian_gap_fill(article["title"]),
        *(["", "Supplemental integrated content:", supplemental_note(article["title"])] if supplemental_note(article["title"]) else []),
        "",
        "Source-derived outline:",
        translated_outline or "No outline could be extracted from the source article.",
        "",
        "Source-derived lesson notes:",
        translated_lead or "No lead paragraphs could be extracted from the source article.",
        "",
        "How to use this lesson:",
        "Read the outline first to understand the sequence of ideas, then use the lesson notes to anchor the main definitions, mechanisms, and practical interpretations before moving to later lessons.",
        "",
        "Full raw scrape:",
        "The complete original scrape is kept in the export dataset for reference, but the lesson view itself is normalized into English instructional content instead of pasting raw Korean text.",
    ]
    return "\n".join(lines).strip()


def topic_specific_code(topic: str, title: str) -> tuple[str, str]:
    overrides = [
        (r"판다스", ("import pandas as pd\nframe = pd.DataFrame({'x': [10, 20]}, index=['a', 'b'])\nprint(frame.loc['a', 'x'])", "10")),
        (r"혼동 행렬|정확도|정밀도|재현율", TOPIC_CODE["evaluation"]),
        (r"entropy|엔트로피", ("import math\np = [0.5, 0.5]\nentropy = -sum(x * math.log2(x) for x in p)\nprint(round(entropy, 2))", "1.0")),
        (r"poisson|포아송", ("import math\nlam = 3\nk = 2\np = math.exp(-lam) * lam**k / math.factorial(k)\nprint(round(p, 4))", "0.224")),
        (r"normal|정규", ("values = [1, 2, 3, 4]\nmean = sum(values) / len(values)\nprint(mean)", "2.5")),
        (r"logistic|로지스틱", ("import math\nx = 0\nsigmoid = 1 / (1 + math.exp(-x))\nprint(sigmoid)", "0.5")),
        (r"softmax", ("import math\nscores = [1.0, 2.0]\nvals = [math.exp(v) for v in scores]\nprint(round(vals[1] / sum(vals), 3))", "0.731")),
        (r"k-means|k-means", TOPIC_CODE["clustering"]),
        (r"spectral", ("affinity = [[1.0, 0.8], [0.8, 1.0]]\nprint(round(affinity[0][1], 1))", "0.8")),
        (r"linear regression|선형회귀", ("x = 3\ny_hat = 2 * x + 1\nprint(y_hat)", "7")),
        (r"svm", ("margin = 2 / 4\nprint(round(margin, 2))", "0.5")),
        (r"perceptron|퍼셉트론", ("score = 0.3 * 2 + 0.7 * 1\nprint(int(score > 1.0))", "1")),
        (r"오차역전파|gradient|미분", ("x = 3\ngrad = 2 * x\nprint(grad)", "6")),
        (r"cnn|convolutional", ("image = [[1, 2], [3, 4]]\nkernel_sum = image[0][0] + image[0][1] + image[1][0] + image[1][1]\nprint(kernel_sum)", "10")),
        (r"resnet|residual", ("x = 3\nresidual = x + 2\nprint(residual)", "5")),
        (r"word2vec|embedding", ("token_to_vec = {'ai': [1, 2, 3]}\nprint(len(token_to_vec['ai']))", "3")),
        (r"rnn", ("state = 0\nfor value in [1, 2, 3]:\n    state += value\nprint(state)", "6")),
        (r"lstm|gru", ("memory = 0.5\nforget = 0.8\nprint(round(memory * forget, 2))", "0.4")),
        (r"attention|transformer|bert", TOPIC_CODE["transformers"]),
        (r"gpt|llm|rag|langchain|langgraph|whisper", TOPIC_CODE["llms"]),
        (r"추천|recommend", TOPIC_CODE["recommenders"]),
        (r"time-series|시계열|arima|sarima", TOPIC_CODE["time_series"]),
        (r"gan|vae|cyclegan|style transfer|genai", TOPIC_CODE["generative_ai"]),
        (r"강화학습|q-learning|dqn|markov", TOPIC_CODE["reinforcement_learning"]),
    ]
    for pattern, payload in overrides:
        if re.search(pattern, title, re.I):
            return payload
    return TOPIC_CODE[topic]


def build_quizzes(topic: str) -> list[dict]:
    q2_q, q2_opts, q2_expl, q2_reason, q3_q, q3_opts, q3_expl, q3_reason = TOPIC_QUIZZES[topic]
    return [
        {
            "id": "q1",
            "type": "predict-output",
            "question": "What is the output?",
        },
        {
            "id": "q2",
            "type": "multiple-choice",
            "question": q2_q,
            "options": q2_opts,
            "explanations": q2_expl,
            "answer": 0,
            "answerReason": q2_reason,
        },
        {
            "id": "q3",
            "type": "multiple-choice",
            "question": q3_q,
            "options": q3_opts,
            "explanations": q3_expl,
            "answer": 0,
            "answerReason": q3_reason,
        },
    ]


def make_id(index: int, article: dict[str, str]) -> str:
    entry = article["url"].rstrip("/").rsplit("/", 1)[-1]
    source = re.sub(r"[^a-z0-9]+", "_", article["source"].lower()).strip("_")
    return f"{index:03d}_{source}_{entry}"


def build_lessons(articles: list[dict[str, str]]) -> list[dict]:
    enriched = []
    for article in articles:
        topic = classify_topic(article)
        enriched.append(
            {
                **article,
                "_topic": topic,
                "_phase": PHASE_ORDER[topic],
                "_specific": specific_rank(article["title"], topic),
                "_series": sequence_hint(article["title"]),
                "_date": parse_date(article["published_at"]),
            }
        )

    enriched.sort(
        key=lambda item: (
            item["_phase"],
            item["_specific"],
            item["_series"],
            item["_date"],
            item["title"],
        )
    )

    lessons = []
    for index, article in enumerate(enriched, start=1):
        code, expected = topic_specific_code(article["_topic"], article["title"])
        lessons.append(
            {
                "id": make_id(index, article),
                "bin": f"python lesson_{index:03d}.py",
                "topic": article["_topic"],
                "title": translate_text(article["title"]),
                "description": build_description(article, article["_topic"]),
                "source": article["source"],
                "sourceUrl": article["url"],
                "publishedAt": article["published_at"],
                "code": code,
                "expectedOutput": expected,
                "quizzes": build_quizzes(article["_topic"]),
            }
        )
    return lessons


def main() -> None:
    articles = json.loads(INPUT.read_text(encoding="utf-8"))
    lessons = build_lessons(articles)
    payload = json.dumps(lessons, ensure_ascii=False, indent=2)
    for output in OUTPUTS:
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(payload, encoding="utf-8")
    save_cache(TRANSLATION_CACHE)
    counts = Counter(lesson["topic"] for lesson in lessons)
    print(f"Wrote {len(lessons)} lessons to {[str(output) for output in OUTPUTS]}")
    print(dict(counts))


if __name__ == "__main__":
    main()
