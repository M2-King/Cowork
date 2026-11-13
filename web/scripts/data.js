/* ==========================================================================
   Epoch — content & sample data
   Course structure is real curriculum; progress numbers are sample data for
   the UI preview (the profile shows a "Sample data" chip).
   ========================================================================== */
(function () {
  'use strict';
  const E = window.Epoch;

  // status: done | current | todo | locked ; pct only for "current"
  const L = (id, title, min, status, intro, tex, extra = {}) => ({ id, title, min, status, intro, tex, ...extra });

  const subjects = [
    {
      id: 'linear-algebra', short: 'Linear Algebra', title: 'Linear Algebra', color: 'la', icon: 'subj-la',
      tagline: 'Vectors, matrices and the geometry of transformations.',
      about: 'Build the language every model is written in. You will see matrices as motions of space, not tables of numbers, which makes eigenvectors, projections and SVD feel obvious.',
      units: [
        { title: 'Vectors and spaces', lessons: [
          L('vectors', 'Vectors as arrows and lists', 8, 'done', 'A vector is both an arrow from the origin and an ordered list of numbers. Adding vectors chains arrows tip to tail; scaling stretches them.', String.raw`\mathbf{v} = \begin{bmatrix} v_1 \\ v_2 \end{bmatrix},\qquad c\,\mathbf{v} + \mathbf{w}`),
          L('span', 'Linear combinations and span', 10, 'done', 'Every point you can reach with a·v + b·w forms the span. Two independent vectors in the plane span all of it.', String.raw`\operatorname{span}(\mathbf{v},\mathbf{w}) = \{\,a\mathbf{v} + b\mathbf{w} : a,b \in \mathbb{R}\,\}`),
          L('basis', 'Basis and dimension', 9, 'done', 'A basis is a minimal set of vectors that spans a space. Every basis of the same space has the same size: its dimension.', String.raw`\mathbf{x} = x_1\,\hat{\imath} + x_2\,\hat{\jmath}`),
        ] },
        { title: 'Matrices as transformations', lessons: [
          L('matvec', 'Matrix–vector multiplication', 11, 'done', 'The columns of a matrix are where the basis vectors land. Multiplying by a vector combines those columns with the vector’s entries as weights.', String.raw`A\mathbf{x} = x_1\mathbf{a}_1 + x_2\mathbf{a}_2`, { lab: 'matrix' }),
          L('composition', 'Composing transformations', 9, 'done', 'Applying B and then A is the single transformation AB. Order matters, because matrix multiplication is not commutative.', String.raw`(AB)\mathbf{x} = A(B\mathbf{x}),\qquad AB \neq BA`),
          L('determinant', 'The determinant as area', 10, 'done', 'The determinant tells you how much a transformation scales area. A negative determinant flips orientation; zero squashes the plane onto a line.', String.raw`\det\begin{bmatrix} a & b \\ c & d \end{bmatrix} = ad - bc`, { lab: 'matrix' }),
        ] },
        { title: 'Eigenvectors and decompositions', lessons: [
          L('eigen', 'Eigenvectors and eigenvalues', 12, 'current', 'An eigenvector stays on its own line when the transformation is applied. Its eigenvalue is how much it stretches along that line.', String.raw`A\mathbf{v} = \lambda\mathbf{v},\qquad \det(A - \lambda I) = 0`, { lab: 'matrix', pct: 0.6 }),
          L('diagonalization', 'Diagonalization', 11, 'todo', 'With a full set of eigenvectors, A is a pure scaling in the eigenbasis, which makes powers of A cheap to compute.', String.raw`A = PDP^{-1},\qquad A^k = PD^kP^{-1}`),
          L('svd', 'Singular value decomposition', 14, 'locked', 'Every matrix is a rotation, an axis-aligned stretch and another rotation. SVD powers PCA and low-rank compression.', String.raw`A = U\,\Sigma\,V^{\top}`),
        ] },
      ],
    },
    {
      id: 'calculus', short: 'Calculus', title: 'Calculus', color: 'calc', icon: 'subj-calc',
      tagline: 'Rates of change, accumulation, and the chain rule behind backprop.',
      about: 'Derivatives tell a model which way to move; integrals add up what it has seen. This course keeps the focus on the pieces optimization actually uses.',
      units: [
        { title: 'Limits and derivatives', lessons: [
          L('limits', 'Limits, intuitively', 8, 'done', 'A limit describes the value a function approaches as its input gets close to a point, whether or not it ever arrives.', String.raw`\lim_{x \to a} f(x) = L`),
          L('derivative', 'The derivative as slope', 10, 'done', 'Shrink a secant line until its two points meet and you get the tangent. The tangent’s slope is the derivative.', String.raw`f'(x) = \lim_{h \to 0} \frac{f(x+h) - f(x)}{h}`, { lab: 'derivative' }),
          L('rules', 'Rules of differentiation', 12, 'done', 'The power, product and quotient rules let you differentiate most expressions without going back to limits.', String.raw`\frac{d}{dx}x^n = nx^{n-1},\qquad (fg)' = f'g + fg'`),
        ] },
        { title: 'Chain rule and many variables', lessons: [
          L('chain-rule', 'The chain rule', 11, 'done', 'To differentiate a composition, multiply the rates of each stage. Backpropagation is this rule applied layer by layer.', String.raw`\frac{dz}{dx} = \frac{dz}{dy}\cdot\frac{dy}{dx}`),
          L('partials', 'Partial derivatives', 9, 'current', 'A partial derivative changes one input while holding the others fixed. It is the slope of one slice through a surface.', String.raw`\frac{\partial f}{\partial x}(x, y) = \lim_{h\to 0}\frac{f(x+h, y) - f(x,y)}{h}`, { pct: 0.35 }),
          L('gradient', 'The gradient vector', 10, 'todo', 'Collect every partial derivative into one vector. It points uphill, in the direction of steepest increase.', String.raw`\nabla f = \left(\frac{\partial f}{\partial x_1}, \dots, \frac{\partial f}{\partial x_n}\right)`, { lab: 'optimizer' }),
        ] },
        { title: 'Integrals', lessons: [
          L('riemann', 'Riemann sums', 9, 'todo', 'Approximate the area under a curve with thin rectangles. The integral is the limit as they become infinitely thin.', String.raw`\int_a^b f(x)\,dx = \lim_{n\to\infty} \sum_{i=1}^{n} f(x_i)\,\Delta x`),
          L('ftc', 'The fundamental theorem', 12, 'locked', 'Differentiation and integration undo each other: accumulate a rate and you recover the total change.', String.raw`\int_a^b f'(x)\,dx = f(b) - f(a)`),
        ] },
      ],
    },
    {
      id: 'linear-regression', short: 'Regression', title: 'Linear Regression', color: 'reg', icon: 'subj-reg',
      tagline: 'Fit lines to data with least squares and gradient descent.',
      about: 'The simplest model that still teaches everything: a hypothesis, a cost, a closed-form answer and an iterative one. Every later model reuses this loop.',
      units: [
        { title: 'The model', lessons: [
          L('hypothesis', 'The hypothesis function', 7, 'done', 'Linear regression predicts a number as a weighted sum of features plus a bias term.', String.raw`\hat{y} = \theta_0 + \theta_1 x_1 + \dots + \theta_n x_n = \boldsymbol{\theta}^{\top}\mathbf{x}`),
          L('cost', 'Mean squared error', 9, 'done', 'MSE averages the squared vertical gaps between predictions and targets. Squaring punishes large misses and keeps the cost surface smooth.', String.raw`J(\boldsymbol\theta) = \frac{1}{2m}\sum_{i=1}^{m}\left(\hat{y}^{(i)} - y^{(i)}\right)^2`, { lab: 'regression' }),
        ] },
        { title: 'Fitting', lessons: [
          L('normal-equation', 'The normal equation', 11, 'done', 'Setting the gradient of the cost to zero gives a closed-form solution, as long as XᵀX is invertible.', String.raw`\boldsymbol\theta = (X^{\top}X)^{-1}X^{\top}\mathbf{y}`, { lab: 'regression' }),
          L('gd-regression', 'Gradient descent for regression', 12, 'current', 'Instead of solving directly, nudge each parameter against the gradient of the cost, one small step at a time.', String.raw`\theta_j \leftarrow \theta_j - \frac{\eta}{m}\sum_{i=1}^{m}\left(\hat{y}^{(i)} - y^{(i)}\right)x_j^{(i)}`, { lab: 'regression', pct: 0.4 }),
          L('feature-scaling', 'Feature scaling', 7, 'todo', 'Features on very different scales stretch the cost surface into a narrow valley. Standardizing them makes descent converge far faster.', String.raw`x' = \frac{x - \mu}{\sigma}`),
        ] },
        { title: 'Evaluation', lessons: [
          L('r-squared', 'R² and residuals', 9, 'todo', 'R² is the share of the variance in y that the model explains. A residual plot reveals patterns a single score hides.', String.raw`R^2 = 1 - \frac{\sum_i (y_i - \hat{y}_i)^2}{\sum_i (y_i - \bar{y})^2}`, { lab: 'regression' }),
          L('regularization', 'Ridge and lasso', 12, 'locked', 'A penalty on weight size trades a little bias for much lower variance. The L1 penalty can set weights exactly to zero.', String.raw`J_{\text{ridge}} = \text{MSE} + \lambda\lVert\boldsymbol\theta\rVert_2^2`),
        ] },
      ],
    },
    {
      id: 'machine-learning', short: 'Machine Learning', title: 'Machine Learning', color: 'ml', icon: 'subj-ml',
      tagline: 'Generalization, the bias–variance trade-off, and the classic algorithms.',
      about: 'Learn what it means for a model to generalize, how to measure it honestly, and the optimizers and algorithms that sit underneath modern practice.',
      units: [
        { title: 'Foundations', lessons: [
          L('supervised', 'Supervised and unsupervised', 7, 'done', 'Supervised learning maps inputs to known labels. Unsupervised learning finds structure, such as clusters, without labels.', String.raw`f : \mathcal{X} \to \mathcal{Y}`),
          L('splits', 'Train, validation and test', 8, 'done', 'Fit on training data, tune on validation data, and use the test set once at the end to estimate real-world error.', String.raw`\mathcal{D} = \mathcal{D}_{\text{train}} \cup \mathcal{D}_{\text{val}} \cup \mathcal{D}_{\text{test}}`),
          L('bias-variance', 'The bias–variance trade-off', 11, 'done', 'Simple models miss patterns (bias); flexible models chase noise (variance). Expected error is both, plus noise you cannot remove.', String.raw`\mathbb{E}\big[(y-\hat f)^2\big] = \text{Bias}^2 + \text{Var} + \sigma^2`),
        ] },
        { title: 'Optimization', lessons: [
          L('gradient-descent', 'Gradient descent', 12, 'current', 'Follow the negative gradient downhill, one step at a time, and the loss falls. The learning rate decides whether you crawl, converge, or diverge.', String.raw`\boldsymbol\theta_{t+1} = \boldsymbol\theta_t - \eta\,\nabla J(\boldsymbol\theta_t)`, { lab: 'optimizer', pct: 0.3, featured: true }),
          L('sgd', 'Stochastic and mini-batch', 10, 'todo', 'Estimating the gradient from a small batch makes each step cheap and noisy, and that noise can shake the model out of poor regions.', String.raw`\boldsymbol\theta \leftarrow \boldsymbol\theta - \eta\,\nabla_{\boldsymbol\theta}\,\frac{1}{|B|}\sum_{i\in B} \ell_i`, { lab: 'optimizer' }),
          L('momentum-adam', 'Momentum and Adam', 12, 'todo', 'Momentum keeps a running velocity. Adam also rescales each parameter by a running estimate of its gradient’s size.', String.raw`m_t = \beta_1 m_{t-1} + (1-\beta_1)\,g_t,\qquad v_t = \beta_2 v_{t-1} + (1-\beta_2)\,g_t^2`, { lab: 'optimizer' }),
        ] },
        { title: 'Classification', lessons: [
          L('logistic', 'Logistic regression', 11, 'locked', 'Squash a linear score through the sigmoid to get a probability, then train it with cross-entropy.', String.raw`P(y=1\mid\mathbf{x}) = \sigma(\boldsymbol\theta^{\top}\mathbf{x}) = \frac{1}{1+e^{-\boldsymbol\theta^{\top}\mathbf{x}}}`),
          L('trees', 'Decision trees', 10, 'locked', 'Split the data on the feature and threshold that most reduce impurity, then repeat on each side.', String.raw`\text{Gini} = 1 - \sum_k p_k^2`),
          L('knn', 'k-nearest neighbours', 8, 'locked', 'Predict by majority vote among the k closest training points. There is no training step, but every prediction scans the data.', String.raw`\hat{y} = \operatorname{mode}\{\,y_i : \mathbf{x}_i \in N_k(\mathbf{x})\,\}`),
        ] },
      ],
    },
    {
      id: 'neural-networks', short: 'Neural Nets', title: 'Neural Networks', color: 'nn', icon: 'subj-nn',
      tagline: 'Neurons, activations and backpropagation from scratch.',
      about: 'Build a network one neuron at a time, then derive backpropagation by hand. By the end you can train a small classifier with nothing but matrix multiplies.',
      units: [
        { title: 'The neuron', lessons: [
          L('perceptron', 'The perceptron', 8, 'done', 'A neuron computes a weighted sum of its inputs plus a bias, then passes the result through an activation function.', String.raw`a = \phi(\mathbf{w}^{\top}\mathbf{x} + b)`),
          L('activations', 'Activation functions', 9, 'done', 'Without non-linear activations, stacked layers collapse into one linear map. ReLU, tanh and sigmoid each bend space differently.', String.raw`\operatorname{ReLU}(z) = \max(0, z),\qquad \sigma(z) = \frac{1}{1+e^{-z}}`, { lab: 'network' }),
        ] },
        { title: 'Learning', lessons: [
          L('forward', 'The forward pass', 10, 'done', 'Data flows layer by layer: multiply by the weights, add the bias, apply the activation, repeat.', String.raw`\mathbf{a}^{(l)} = \phi\!\left(W^{(l)}\mathbf{a}^{(l-1)} + \mathbf{b}^{(l)}\right)`),
          L('loss-functions', 'Loss functions', 9, 'done', 'Cross-entropy measures how surprised the model is by the true label. Lower surprise means better predictions.', String.raw`\mathcal{L} = -\sum_k y_k \log \hat{y}_k`),
          L('backpropagation', 'Backpropagation, step by step', 14, 'current', 'Backprop sends the error backward through the network, using the chain rule to get every weight’s gradient in a single pass.', String.raw`\boldsymbol\delta^{(l)} = \left(W^{(l+1)\top}\boldsymbol\delta^{(l+1)}\right) \odot \phi'\!\left(\mathbf{z}^{(l)}\right)`, { lab: 'network', pct: 0.62 }),
        ] },
        { title: 'Training well', lessons: [
          L('initialization', 'Weight initialization', 9, 'todo', 'Scale the starting weights so activations keep a steady variance from layer to layer. Xavier and He initialization do exactly that.', String.raw`W \sim \mathcal{N}\!\left(0,\ \tfrac{2}{n_{\text{in}}}\right)`),
          L('regularizing-nets', 'Dropout and early stopping', 10, 'locked', 'Randomly silencing neurons during training, or stopping when validation loss turns upward, keeps a network from memorizing.', String.raw`\tilde{\mathbf{h}} = \mathbf{m} \odot \mathbf{h},\qquad m_i \sim \operatorname{Bernoulli}(p)`),
        ] },
      ],
    },
    {
      id: 'deep-learning', short: 'Deep Learning', title: 'Deep Learning', color: 'dl', icon: 'subj-dl',
      tagline: 'Convolutions, sequence models and attention.',
      about: 'Go from one hidden layer to architectures that see, read and attend. Each idea arrives with a lab, so you can watch it work before you write it.',
      units: [
        { title: 'Convolutional networks', lessons: [
          L('convolution', 'The convolution operation', 11, 'current', 'A small kernel slides across the image and computes a weighted sum at each position. Shared weights let it find a pattern anywhere.', String.raw`(I * K)(i,j) = \sum_{m}\sum_{n} I(i+m,\ j+n)\,K(m,n)`, { lab: 'convolution', pct: 0.2 }),
          L('pooling', 'Pooling and stride', 8, 'todo', 'Pooling and strided convolutions shrink feature maps, trading spatial detail for a wider receptive field.', String.raw`n_{\text{out}} = \left\lfloor \frac{n + 2p - k}{s} \right\rfloor + 1`, { lab: 'convolution' }),
          L('cnn-architectures', 'Classic CNN architectures', 12, 'locked', 'Stacked blocks of convolution, activation and pooling build features from edges, to textures, to whole objects.', String.raw`\text{conv} \to \text{ReLU} \to \text{pool}`),
        ] },
        { title: 'Sequences', lessons: [
          L('rnn', 'Recurrent networks', 11, 'locked', 'An RNN carries a hidden state from step to step, so each output can depend on everything seen so far.', String.raw`\mathbf{h}_t = \tanh\!\left(W_h\mathbf{h}_{t-1} + W_x\mathbf{x}_t + \mathbf{b}\right)`),
          L('lstm', 'LSTMs and gating', 12, 'locked', 'Gates decide what to forget, what to write and what to output, letting gradients survive long sequences.', String.raw`\mathbf{c}_t = \mathbf{f}_t \odot \mathbf{c}_{t-1} + \mathbf{i}_t \odot \tilde{\mathbf{c}}_t`),
        ] },
        { title: 'Attention', lessons: [
          L('attention', 'Self-attention', 13, 'locked', 'Each token makes a query, a key and a value. Its output is an average of all values, weighted by query–key similarity.', String.raw`\operatorname{Attention}(Q,K,V) = \operatorname{softmax}\!\left(\frac{QK^{\top}}{\sqrt{d_k}}\right)V`),
          L('transformers', 'The transformer block', 14, 'locked', 'Attention, a feed-forward layer, residual connections and layer norm, stacked many times over.', String.raw`\mathbf{x} \leftarrow \mathbf{x} + \operatorname{MHA}\!\big(\operatorname{LN}(\mathbf{x})\big)`),
        ] },
      ],
    },
  ];

  // Game layer: each course is a chapter of the campaign, set in its own realm
  const GAME = {
    'linear-algebra':    { realm: 'The Lattice', numeral: 'I', difficulty: 1 },
    calculus:            { realm: 'Slopes of Change', numeral: 'II', difficulty: 2 },
    'linear-regression': { realm: 'The Least Squares', numeral: 'III', difficulty: 2 },
    'machine-learning':  { realm: 'Generalization Frontier', numeral: 'IV', difficulty: 3 },
    'neural-networks':   { realm: 'The Neural Wilds', numeral: 'V', difficulty: 4 },
    'deep-learning':     { realm: 'The Deep', numeral: 'VI', difficulty: 5 },
  };
  subjects.forEach((s) => Object.assign(s, GAME[s.id]));

  // Derived fields
  const lessonIndex = {};
  subjects.forEach((s) => {
    s.lessons = [];
    s.units.forEach((u, ui) => u.lessons.forEach((l) => { l.subject = s.id; l.unit = ui; l.unitTitle = u.title; s.lessons.push(l); lessonIndex[l.id] = l; }));
    s.lessons.forEach((l, i) => { l.n = i + 1; l.xp = Math.round((l.min * 4) / 10) * 10; });
    s.units.forEach((u) => { u.lessons[u.lessons.length - 1].boss = true; });
    const done = s.lessons.filter((l) => l.status === 'done').length;
    const cur = s.lessons.find((l) => l.status === 'current');
    s.progress = (done + (cur ? cur.pct || 0 : 0)) / s.lessons.length;
    s.minutes = s.lessons.reduce((a, l) => a + l.min, 0);
    s.next = cur || s.lessons.find((l) => l.status === 'todo') || s.lessons[0];
    s.done = done;
  });

  const labs = [
    { id: 'matrix', code: 'SIM-01', title: 'Matrix Transform', subject: 'linear-algebra', blurb: 'Change the entries of a 2×2 matrix and watch the plane bend. Area scales by the determinant.' },
    { id: 'derivative', code: 'SIM-02', title: 'Tangent and Secant', subject: 'calculus', blurb: 'Slide a point along a curve and shrink h until the secant line becomes the tangent.' },
    { id: 'regression', code: 'SIM-03', title: 'Least Squares', subject: 'linear-regression', blurb: 'Place points, then fit a line in closed form or watch gradient descent find it.' },
    { id: 'optimizer', code: 'SIM-04', title: 'Optimizer Race', subject: 'machine-learning', blurb: 'SGD, Momentum and Adam race downhill from the same start on the same loss surface.' },
    { id: 'network', code: 'SIM-05', title: 'Neural Playground', subject: 'neural-networks', blurb: 'Train a tiny network in your browser and watch its decision boundary take shape.' },
    { id: 'convolution', code: 'SIM-06', title: 'Convolution', subject: 'deep-learning', blurb: 'Slide a 3×3 kernel over an image and see each output pixel get computed.' },
  ];

  const cards = [
    { s: 'linear-algebra', q: 'What does the determinant of a 2×2 matrix measure?', a: 'How much the transformation scales area. A negative value means orientation flips; zero means the plane collapses onto a line.', tex: String.raw`\det\begin{bmatrix} a & b \\ c & d \end{bmatrix} = ad - bc` },
    { s: 'machine-learning', q: 'Write the gradient descent update rule.', a: 'Step against the gradient, scaled by the learning rate η.', tex: String.raw`\boldsymbol\theta \leftarrow \boldsymbol\theta - \eta\,\nabla J(\boldsymbol\theta)` },
    { s: 'neural-networks', q: 'What is the derivative of the sigmoid σ(x)?', a: 'It can be written using σ itself, which makes it cheap during backprop.', tex: String.raw`\sigma'(x) = \sigma(x)\,\big(1 - \sigma(x)\big)` },
    { s: 'calculus', q: 'State the chain rule for z = f(g(x)).', a: 'Multiply the outer derivative, evaluated at the inner function, by the inner derivative.', tex: String.raw`\frac{dz}{dx} = f'\big(g(x)\big)\,g'(x)` },
    { s: 'linear-regression', q: 'What is the normal equation?', a: 'The closed-form least-squares solution for linear regression.', tex: String.raw`\boldsymbol\theta = (X^{\top}X)^{-1}X^{\top}\mathbf{y}` },
    { s: 'linear-algebra', q: 'Define an eigenvector of A.', a: 'A non-zero vector whose direction A leaves unchanged; it is only scaled, by the eigenvalue λ.', tex: String.raw`A\mathbf{v} = \lambda\mathbf{v},\quad \mathbf{v} \neq \mathbf{0}` },
    { s: 'machine-learning', q: 'Low training error but high validation error is a sign of…', a: 'High variance, also called overfitting. Try more data, regularization or a simpler model.', tex: '' },
    { s: 'neural-networks', q: 'What is ReLU, and what is its derivative?', a: 'ReLU passes positive inputs through and zeroes the rest. Its derivative is 1 for z > 0 and 0 for z < 0.', tex: String.raw`\operatorname{ReLU}(z) = \max(0, z)` },
    { s: 'deep-learning', q: 'Output size of a convolution layer?', a: 'Input size n, kernel k, padding p and stride s give:', tex: String.raw`n_{\text{out}} = \left\lfloor \frac{n + 2p - k}{s} \right\rfloor + 1` },
    { s: 'deep-learning', q: 'Write scaled dot-product attention.', a: 'Similarity of queries and keys, scaled and normalized, weights the values.', tex: String.raw`\operatorname{softmax}\!\left(\frac{QK^{\top}}{\sqrt{d_k}}\right)V` },
    { s: 'linear-regression', q: 'Why do we square the errors in MSE?', a: 'Squaring makes every error positive, punishes large misses more, and gives a smooth, convex cost with an easy gradient.', tex: String.raw`J = \frac{1}{2m}\sum (\hat{y} - y)^2` },
    { s: 'calculus', q: 'Which direction does the gradient point?', a: 'Toward the steepest increase of the function. Gradient descent moves the opposite way.', tex: String.raw`\nabla f = \left(\tfrac{\partial f}{\partial x}, \tfrac{\partial f}{\partial y}\right)` },
  ];

  // Sample activity, stable between reloads
  function activity(weeks = 26) {
    const r = E.rng(2026);
    const days = [];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const total = weeks * 7;
    for (let i = 0; i < total; i++) {
      const d = new Date(today); d.setDate(today.getDate() - (total - 1 - i));
      const wd = (d.getDay() + 6) % 7; // Mon=0
      const recent = i > total - 24; // the current 23-day streak
      let m = r() < (wd >= 5 ? 0.45 : 0.72) ? Math.round(8 + r() * (wd >= 5 ? 40 : 58)) : 0;
      if (recent) m = Math.max(m, Math.round(12 + r() * 40));
      if (i === total - 24) m = 0; // the day before the streak began
      days.push({ date: d, min: m });
    }
    days[days.length - 1].min = 18; // today so far
    return days;
  }

  E.Data = {
    subjects,
    subject: (id) => subjects.find((s) => s.id === id),
    lesson: (id) => lessonIndex[id],
    labs,
    lab: (id) => labs.find((l) => l.id === id),
    cards,
    activity: activity(),
    user: { callsign: 'Operator', level: 7, rank: 'Gradient Adept', nextRank: 'Backprop Knight', xp: 1240, nextXp: 1500, streak: 23, best: 41, shards: 860, accuracy: 0.87 },
    goals: [
      { id: 'learn', label: 'Learn', unit: 'min', value: 18, goal: 30, color: 'var(--accent)' },
      { id: 'practice', label: 'Practice', unit: 'problems', value: 12, goal: 20, color: 'var(--c-reg)' },
      { id: 'review', label: 'Review', unit: 'cards', value: 28, goal: 40, color: 'var(--c-calc)' },
    ],
  };
})();
