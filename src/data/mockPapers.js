export const mockPapers = [
  {
    id: "transformer_2017",
    title: "Attention Is All You Need",
    authors: "Ashish Vaswani, Noam Shazeer, Niki Parmar, Jakob Uszkoreit, Llion Jones, Aidan N. Gomez, Łukasz Kaiser, Illia Polosukhin",
    year: 2017,
    citations: 112000,
    venue: "NeurIPS",
    category: "Core",
    pdfUrl: "https://arxiv.org/pdf/1706.03762.pdf",
    tldr: "RNN이나 CNN 없이 자가 어텐션(Self-Attention) 메커니즘만을 사용하는 최초의 Sequence-to-Sequence 아키텍처인 Transformer를 제안했습니다.",
    keyContribution: "재귀적 루프(Recurrent loops)를 완전히 제거하고 병렬 처리가 가능한 Self-Attention 메커니즘을 도입하여 학습 속도와 장기 의존성(Long-range dependency) 학습 능력을 획기적으로 개선했습니다.",
    dataset: "WMT 2014 English-to-German & English-to-French",
    metrics: "BLEU Score: 28.4 (En-De), 41.8 (En-Fr)",
    limitations: "입력 시퀀스 길이 $N$에 대해 메모리 및 연산 복잡도가 quadratic ($O(N^2)$)으로 증가하여 매우 긴 시퀀스 처리에 한계가 있습니다.",
    equations: [
      {
        name: "Scaled Dot-Product Attention",
        latex: "Attention(Q, K, V) = softmax(\\frac{QK^T}{\\sqrt{d_k}})V",
        description: "쿼리(Query)와 키(Key)의 내적을 스케일링 인자(\\sqrt{d_k})로 나눈 후 소프트맥스를 취해 밸류(Value)의 가중합을 계산합니다."
      },
      {
        name: "Multi-Head Attention",
        latex: "MultiHead(Q, K, V) = Concat(head_1, ..., head_h)W^O \\\\ \\text{where } head_i = Attention(QW_i^Q, KW_i^K, VW_i^V)",
        description: "서로 다른 선형 투영을 통해 어텐션을 병렬로 여러 번 수행한 후, 결과를 결합하여 다양한 표현 공간의 정보를 포착합니다."
      }
    ],
    references: []
  },
  {
    id: "bert_2018",
    title: "BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding",
    authors: "Jacob Devlin, Ming-Wei Chang, Kenton Lee, Kristina Toutanova",
    year: 2018,
    citations: 98000,
    venue: "NAACL",
    category: "NLP",
    pdfUrl: "https://arxiv.org/pdf/1810.04805.pdf",
    tldr: "양방향 컨텍스트를 동시에 학습하는 Masked Language Model(MLM) 전처리를 도입하여 NLP 다운스트림 태스크에서 SOTA를 달성했습니다.",
    keyContribution: "왼쪽에서 오른쪽 또는 오른쪽에서 왼쪽으로만 단방향 학습을 하던 기존 언어 모델의 한계를 극복하고, 양방향(Bidirectional) 컨텍스트를 모두 활용하여 문장의 문맥적 의미를 깊이 있게 파악합니다.",
    dataset: "BooksCorpus (800M words), English Wikipedia (2,500M words)",
    metrics: "GLUE Score: 80.5% (BERT-Base), SQuAD v1.1 F1: 93.2%",
    limitations: "Pre-training 단계에서 사용되는 [MASK] 토큰이 Fine-tuning 단계에서는 존재하지 않아 모델 입력의 불일치가 발생합니다.",
    equations: [
      {
        name: "Masked LM Loss",
        latex: "\\mathcal{L}_{MLM} = -\\sum_{i \\in M} \\log P(w_i | \\tilde{X})",
        description: "마스킹 처리된 입력 문장(\\tilde{X})에서 원래 마스킹된 토큰(w_i)들의 예측 확률의 음의 로그 우도를 최소화합니다."
      }
    ],
    references: ["transformer_2017"]
  },
  {
    id: "roberta_2019",
    title: "RoBERTa: A Robustly Optimized BERT Pretraining Approach",
    authors: "Yinhan Liu, Myle Ott, Naman Goyal, Jingfei Du, Mandar Joshi, Danqi Chen, Omer Levy, Mike Lewis, Luke Zettlemoyer, Veselin Stoyanov",
    year: 2019,
    citations: 18000,
    venue: "arXiv",
    category: "NLP",
    pdfUrl: "https://arxiv.org/pdf/1907.11692.pdf",
    tldr: "BERT의 하이퍼파라미터와 학습 데이터 설정을 최적화하고 Next Sentence Prediction(NSP)을 제거하여 성능을 대폭 개선했습니다.",
    keyContribution: "BERT가 과소적합(Underfitted)되었다는 점을 규명하고, 더 큰 배치 사이즈, 더 많은 데이터, 동적 마스킹(Dynamic Masking), 더 긴 학습 시간 등을 통해 성능을 최적화했습니다.",
    dataset: "BOOKCORPUS, WIKIPEDIA, CC-NEWS, OPENWEBTEXT, STORIES (총 160GB 데이터)",
    metrics: "GLUE Score: 88.5%, SQuAD v2.0 F1: 89.4%",
    limitations: "아키텍처 관점의 개선보다는 하이퍼파라미터 및 학습 환경의 튜닝 위주여서 컴퓨팅 자원의 소모가 급증했습니다.",
    equations: [
      {
        name: "Dynamic Masking",
        latex: "\\text{Masking}_{dynamic}(\\text{Epoch } t) \\neq \\text{Masking}_{dynamic}(\\text{Epoch } t+1)",
        description: "매 에포크마다 입력 시퀀스에 새로운 마스킹 패턴을 부여하여 모델이 고정된 마스크에 과적합되지 않도록 유도합니다."
      }
    ],
    references: ["bert_2018", "transformer_2017"]
  },
  {
    id: "vit_2020",
    title: "An Image is Worth 16x16 Words: Transformers for Image Recognition at Scale",
    authors: "Alexey Dosovitskiy, Lucas Beyer, Alexander Kolesnikov, Dirk Weissenborn, Xiaohua Zhai, Thomas Unterthiner, Mostafa Dehghani, Matthias Minderer, Georg Heigold, Sylvain Gelly, Jakob Uszkoreit, Neil Houlsby",
    year: 2020,
    citations: 34000,
    venue: "ICLR",
    category: "Vision",
    pdfUrl: "https://arxiv.org/pdf/2010.11929.pdf",
    tldr: "합성곱(CNN) 연산 없이 이미지를 16x16 패치로 나누어 1D 시퀀스로 입력함으로써 Transformer를 비전 분야로 확장시켰습니다.",
    keyContribution: "이미지 2D 패치를 평탄화(Flatten)하고 선형 투영(Linear Projection)을 적용하여 NLP의 단어 토큰처럼 처리하여 퓨어 트랜스포머 아키텍처를 이미지 분류에 성공적으로 이식했습니다.",
    dataset: "JFT-300M (Pre-train), ImageNet-1K (Fine-tune)",
    metrics: "ImageNet Accuracy: 88.55%, ImageNet-ReaL: 90.72%",
    limitations: "CNN에 있는 귀납적 편향(Inductive Bias, 예: 평행이동 불변성)이 없기 때문에 데이터가 충분하지 않은 소규모 데이터셋에서는 CNN보다 성능이 떨어집니다.",
    equations: [
      {
        name: "Patch Embedding Projection",
        latex: "z_0 = [x_{class}; x_p^1 E; x_p^2 E; ...; x_p^N E] + E_{pos}",
        description: "이미지 패치들(x_p)에 선형 투영(E)을 곱한 뒤 클래스 토큰(x_{class}) 및 위치 임베딩(E_{pos})을 더해 입력 벡터를 구성합니다."
      }
    ],
    references: ["transformer_2017"]
  },
  {
    id: "deit_2020",
    title: "Training data-efficient image transformers & distillation through attention",
    authors: "Hugo Touvron, Matthieu Cord, Matthijs Douze, Francisco Massa, Alexandre Sablayrolles, Hervé Jégou",
    year: 2020,
    citations: 7200,
    venue: "ICML",
    category: "Vision",
    pdfUrl: "https://arxiv.org/pdf/2012.12877.pdf",
    tldr: "교사-학생 증류(Distillation) 토큰을 도입하여 비전 트랜스포머(ViT)가 거대 데이터셋 없이 ImageNet-1K만으로도 고성능을 내도록 학습 효율을 높였습니다.",
    keyContribution: "트랜스포머 아키텍처 내에 별도의 디스틸레이션 토큰(Distillation Token)을 배치하여, CNN 교사 모델(Teacher)의 예측값으로부터 효율적으로 지식을 증류받도록 설계했습니다.",
    dataset: "ImageNet-1K",
    metrics: "ImageNet Top-1 Accuracy: 83.1% (추가 데이터 없이 학습)",
    limitations: "지식 증류를 유도하기 위해 강력한 CNN 교사 모델이 필요하며, 학습 파이프라인의 하이퍼파라미터에 상당히 민감합니다.",
    equations: [
      {
        name: "Hard-Label Distillation Loss",
        latex: "\\mathcal{L}_{global} = \\frac{1}{2} \\mathcal{L}_{CE}(\\psi(x), y) + \\frac{1}{2} \\mathcal{L}_{CE}(\\psi_d(x), y_t)",
        description: "실제 정답 라벨(y)에 대한 크로스 엔트로피 오차와 교사 모델의 예측 클래스(y_t)에 대한 크로스 엔트로피 오차를 평균 내어 학습합니다."
      }
    ],
    references: ["vit_2020", "transformer_2017"]
  },
  {
    id: "swin_2021",
    title: "Swin Transformer: Hierarchical Vision Transformer using Shifted Windows",
    authors: "Ze Liu, Yutong Lin, Yue Cao, Han Hu, Yixuan Wei, Zheng Zhang, Stephen Lin, Baining Guo",
    year: 2021,
    citations: 21000,
    venue: "ICCV",
    category: "Vision",
    pdfUrl: "https://arxiv.org/pdf/2103.14030.pdf",
    tldr: "Shifted Window 어텐션 메커니즘과 계층적(Hierarchical) 구조를 도입해 다양한 스케일의 비전 태스크(검출, 세그멘테이션)로의 범용성을 넓혔습니다.",
    keyContribution: "어텐션 연산을 격자 모양의 국소 윈도우(Window) 내로 제한하여 선형 시간 복잡도($O(N)$)를 달성하고, 윈도우를 교차(Shifted) 이동시키며 윈도우 경계를 넘는 정보 교환을 유도했습니다.",
    dataset: "ImageNet-22K (Pre-train), COCO Object Detection, ADE20K Segmentation",
    metrics: "ImageNet-1K Accuracy: 87.3%, COCO box AP: 58.7, ADE20K mIoU: 53.5",
    limitations: "윈도우 이동 및 복잡한 마스킹 패턴 계산으로 인해 구현 코드의 직관성이 저하되고 디버깅 난이도가 높습니다.",
    equations: [
      {
        name: "Shifted Window Complexity",
        latex: "\\mathcal{O}(\\text{W-MSA}) = 4hw d^2 + 2M^2 hw d",
        description: "윈도우 크기 $M \\times M$이 고정일 때, 시퀀스 길이 $hw$에 대해 이차 복잡도 대신 선형 복잡도를 가짐을 보여줍니다."
      }
    ],
    references: ["vit_2020", "transformer_2017"]
  }
];
