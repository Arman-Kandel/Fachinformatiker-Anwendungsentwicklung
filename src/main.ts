import './styles.css';
import { getModuleCatalog, getModuleIndex, getModuleById, getQuizByModuleId } from './app/content-loader/content-loader';
import { loadAppState, saveAppState } from './app/storage/local-store';
import { buildExamDeck, buildModuleOverview, buildModuleProgress, buildReviewQueue, computeAccuracy, getMasteryLevel, getQuestionById, validateModule } from './lib/learning';
import type { AppState, Module, ModuleOverview, ModuleProgress, Question } from './types';

const STORAGE_KEY = 'ihk-lernplattform-state-v1';
const moduleCatalog = getModuleCatalog();
const moduleIndex = getModuleIndex();
const firstModule = moduleCatalog[0];
const defaultState: AppState = {
  resumeModuleId: firstModule?.moduleId ?? null,
  currentQuestionId: getQuizByModuleId(firstModule?.moduleId ?? '')?.questions[0]?.id ?? null,
  selectedModuleId: firstModule?.moduleId ?? null,
  studySectionId: firstModule?.sections[0]?.id ?? null,
  reviewQueue: {},
  moduleProgress: {},
  answeredQuestions: {},
  lastUpdatedAt: null,
};

const state = loadAppState<AppState>(STORAGE_KEY, defaultState);
const app = document.querySelector('#app') as HTMLElement;

function ensureModuleState(moduleId: string): void {
  const module = getModuleById(moduleId);
  const quiz = getQuizByModuleId(moduleId);

  if (!module || !quiz) {
    return;
  }

  if (!state.moduleProgress[moduleId]) {
    state.moduleProgress[moduleId] = buildModuleProgress(moduleId, quiz.questions.length, 0, 0, new Date().toISOString());
  }
}

function getSelectedModule(): Module {
  const selectedId = state.selectedModuleId ?? firstModule?.moduleId ?? null;

  if (!selectedId) {
    throw new Error('No module available');
  }

  const selectedModule = getModuleById(selectedId);
  if (!selectedModule) {
    throw new Error(`Module not found: ${selectedId}`);
  }

  return selectedModule;
}

function getCurrentQuiz() {
  const selectedModule = getSelectedModule();
  const quiz = getQuizByModuleId(selectedModule.moduleId);
  return quiz ?? { quizId: selectedModule.moduleId, title: selectedModule.title, questions: [] };
}

function getCurrentProgress(): ModuleProgress {
  const selectedModule = getSelectedModule();
  const currentQuiz = getCurrentQuiz();
  const progress = state.moduleProgress[selectedModule.moduleId] ?? buildModuleProgress(
    selectedModule.moduleId,
    currentQuiz.questions.length,
    0,
    0,
    new Date().toISOString(),
  );

  state.moduleProgress[selectedModule.moduleId] = progress;
  return progress;
}

function getCurrentReviewQueue(): string[] {
  const selectedModule = getSelectedModule();
  const currentQuiz = getCurrentQuiz();
  const persistedQueue = state.reviewQueue[selectedModule.moduleId] ?? [];
  const derivedQueue = buildReviewQueue(currentQuiz.questions, state.answeredQuestions);
  const validQueue = [...new Set([...derivedQueue, ...persistedQueue])].filter((questionId) => currentQuiz.questions.some((question) => question.id === questionId));

  state.reviewQueue[selectedModule.moduleId] = validQueue;
  return validQueue;
}

function getCurrentSection() {
  const selectedModule = getSelectedModule();
  const section = selectedModule.sections.find((item) => item.id === state.studySectionId) ?? selectedModule.sections[0] ?? null;

  if (section) {
    state.studySectionId = section.id;
  }

  return section;
}

function renderSourceRefs(sourceRefs: Array<{ sourceId: string; quote: string; section: string; type?: string }>): string {
  return sourceRefs
    .map(
      (ref) => `
        <li>
          <span>${ref.sourceId}</span>
          <strong>${ref.section}</strong>
          <p>${ref.quote}</p>
        </li>
      `,
    )
    .join('');
}

function renderModuleCard(item: (typeof moduleIndex)[number]): string {
  const active = item.moduleId === state.selectedModuleId;
  const sourceModule = getModuleById(item.moduleId);
  const overview = buildModuleOverview(moduleCatalog, state.moduleProgress).find((entry) => entry.moduleId === item.moduleId) ?? {
    moduleId: item.moduleId,
    title: item.title,
    exam: sourceModule?.exam ?? 'AP1',
    difficulty: sourceModule?.difficulty ?? item.difficulty,
    percent: 0,
    mastery: 'starter',
    status: 'not-started',
  } satisfies ModuleOverview;

  return `
    <button class="module-card ${active ? 'active' : ''}" type="button" data-module-id="${item.moduleId}">
      <div class="module-topline">
        <span>${item.difficulty}</span>
        <span>${item.estimatedMinutes} min</span>
      </div>
      <strong>${item.title}</strong>
      <small>${item.sourceRefs[0]?.sourceId ?? 'FIAUSBV'} · ${overview.mastery}</small>
      <div class="mini-progress">
        <span style="width: ${overview.percent}%"></span>
      </div>
    </button>
  `;
}

function renderQuestion(question: Question): string {
  const selectedAnswer = state.answeredQuestions[question.id];
  const isAnswered = selectedAnswer !== undefined;

  return `
    <div class="question-box">
      <div class="question-meta">
        <span>Frage</span>
        <strong>${question.id.toUpperCase()}</strong>
      </div>
      <h3>${question.question}</h3>
      <div class="options">
        ${question.options
          .map((option, index) => {
            const isCorrect = isAnswered && index === question.correctIndex;
            const isWrong = isAnswered && index === selectedAnswer && index !== question.correctIndex;
            return `
              <button
                type="button"
                class="answer-option ${isCorrect ? 'correct' : ''} ${isWrong ? 'incorrect' : ''}"
                data-answer-index="${index}"
                data-question-id="${question.id}"
                ${isAnswered ? 'disabled' : ''}
              >
                <span>${String.fromCharCode(65 + index)}</span>
                <span>${option}</span>
              </button>
            `;
          })
          .join('')}
      </div>
      ${isAnswered ? `
        <div class="result-panel">
          <p class="result-label">${selectedAnswer === question.correctIndex ? 'Richtig' : 'Nicht ganz'}</p>
          <p>${question.explanation}</p>
          <ul class="source-list">${renderSourceRefs(question.sourceRefs)}</ul>
        </div>
      ` : ''}
    </div>
  `;
}

function saveCurrentState(): void {
  state.lastUpdatedAt = new Date().toISOString();
  saveAppState(STORAGE_KEY, state);
}

function render(): void {
  const selectedModule = getSelectedModule();
  const currentQuiz = getCurrentQuiz();
  const currentSection = getCurrentSection();
  const validationErrors = validateModule(selectedModule);
  const progress = getCurrentProgress();
  const reviewQueue = getCurrentReviewQueue();
  const currentQuestion = getQuestionById(currentQuiz.questions, state.currentQuestionId);
  ensureModuleState(selectedModule.moduleId);

  app.innerHTML = `
    <div class="app-shell">
      <header class="page-header">
        <div>
          <p class="eyebrow">Fortsetzen / Wiederholen</p>
          <h1>IHK Lernplattform</h1>
        </div>
        <div class="header-badges">
          <span class="badge">GitHub Pages</span>
          <span class="badge">Browser-local</span>
        </div>
      </header>

      <main class="layout">
        <section class="panel highlight">
          <div>
            <p class="eyebrow">Resume-First</p>
            <h2>Aktuelles Lernfenster</h2>
          </div>
          <div class="cta-row">
            <button class="primary" type="button" data-action="resume">Fortsetzen</button>
            <button type="button" data-action="study-today">Heute üben</button>
            <button type="button" data-action="quick-test">Schnelltest</button>
            <button type="button" data-action="exam-mode">Prüfungsmodus</button>
            <button type="button" data-action="review-next" ${reviewQueue.length === 0 ? 'disabled' : ''}>Wiederholen</button>
          </div>
          <p class="summary">
            ${selectedModule.title} · ${computeAccuracy(progress.correct, progress.total)}% Trefferquote · ${getMasteryLevel(progress).label} · ${selectedModule.learningObjectives[0]}
          </p>
          ${validationErrors.length > 0 ? `<p class="validation-warning">Warnung: ${validationErrors.join(', ')}</p>` : ''}
        </section>

        <section class="panel">
          <div class="section-head">
            <h2>Module</h2>
            <span class="pill">${moduleCatalog.length} Inhalte</span>
          </div>
          <div class="overview-strip">
            ${buildModuleOverview(moduleCatalog, state.moduleProgress)
              .map(
                (entry) => `
                  <div class="overview-pill ${entry.status === 'completed' ? 'done' : ''}">
                    <span>${entry.title}</span>
                    <strong>${entry.percent}%</strong>
                  </div>
                `,
              )
              .join('')}
          </div>
          <div class="module-grid">
            ${moduleIndex.map(renderModuleCard).join('')}
          </div>
        </section>

        <section class="panel practice">
          <div class="section-head">
            <div>
              <p class="eyebrow">Lernmodul</p>
              <h2>${selectedModule.title}</h2>
            </div>
            <span class="pill">${selectedModule.exam}</span>
          </div>

          <div class="stat-row">
            <div class="stat-box">
              <span>Fortschritt</span>
              <strong>${progress.seen}/${progress.total}</strong>
            </div>
            <div class="stat-box">
              <span>Genauigkeit</span>
              <strong>${computeAccuracy(progress.correct, progress.total)}%</strong>
            </div>
            <div class="stat-box">
              <span>Schwierigkeit</span>
              <strong>${selectedModule.difficulty}</strong>
            </div>
          </div>

          <div class="mastery-panel">
            <div class="section-head compact">
              <h3>Mastery</h3>
              <span class="pill">${getMasteryLevel(progress).label}</span>
            </div>
            <div class="mastery-bar">
              <span style="width: ${getMasteryLevel(progress).percent}%"></span>
            </div>
          </div>

          <div class="study-panel">
            <div class="section-head compact">
              <h3>Lernabschnitte</h3>
              <span class="pill">${selectedModule.sections.length} Abschnitte</span>
            </div>
            <div class="study-grid">
              ${selectedModule.sections
                .map(
                  (section) => `
                    <button
                      type="button"
                      class="study-card ${section.id === state.studySectionId ? 'active' : ''}"
                      data-section-id="${section.id}"
                    >
                      <span>${section.type}</span>
                      <strong>${section.title}</strong>
                    </button>
                  `,
                )
                .join('')}
            </div>
            ${currentSection ? `
              <article class="section-detail">
                <div class="section-header">
                  <span>${currentSection.type}</span>
                  <strong>${currentSection.title}</strong>
                </div>
                <p>${currentSection.content}</p>
                <ul class="source-list">${renderSourceRefs(currentSection.sourceRefs)}</ul>
              </article>
            ` : ''}
          </div>

          <div class="review-box">
            <div class="section-head compact">
              <h3>Wiederholungs-Queue</h3>
              <span class="pill">${reviewQueue.length} offen</span>
            </div>
            ${reviewQueue.length > 0 ? `
              <div class="review-list">
                ${reviewQueue
                  .map(
                    (questionId, index) => `
                      <button type="button" class="review-item" data-review-question="${questionId}">
                        <span>${index + 1}</span>
                        <strong>${questionId.toUpperCase()}</strong>
                      </button>
                    `,
                  )
                  .join('')}
              </div>
            ` : '<p>Keine offenen Wiederholungen.</p>'}
          </div>

          <div class="objective-list">
            ${selectedModule.learningObjectives.map((objective) => `<li>${objective}</li>`).join('')}
          </div>

          ${currentQuestion ? renderQuestion(currentQuestion) : '<p>Keine Fragen verfügbar.</p>'}

          <div class="source-panel">
            <h3>Quellenbeleg</h3>
            <ul class="source-list">${renderSourceRefs(selectedModule.sourceRefs)}</ul>
          </div>
        </section>
      </main>
    </div>
  `;

  document.querySelectorAll('[data-module-id]').forEach((button) => {
    button.addEventListener('click', () => {
      const nextId = button.getAttribute('data-module-id');
      if (!nextId) return;

      const nextModule = getModuleById(nextId);
      state.selectedModuleId = nextId;
      state.resumeModuleId = nextId;
      state.studySectionId = nextModule?.sections[0]?.id ?? null;
      const nextQuiz = getQuizByModuleId(nextId);
      state.currentQuestionId = nextQuiz?.questions[0]?.id ?? null;
      ensureModuleState(nextId);
      saveCurrentState();
      render();
    });
  });

  document.querySelectorAll('[data-section-id]').forEach((button) => {
    button.addEventListener('click', () => {
      const sectionId = button.getAttribute('data-section-id');
      if (!sectionId) return;
      state.studySectionId = sectionId;
      saveCurrentState();
      render();
    });
  });

  document.querySelectorAll('[data-answer-index]').forEach((button) => {
    button.addEventListener('click', () => {
      const questionId = button.getAttribute('data-question-id');
      const answerIndex = Number(button.getAttribute('data-answer-index'));
      if (!questionId || Number.isNaN(answerIndex)) return;

      const selectedModule = getSelectedModule();
      const currentQuestion = getQuestionById(currentQuiz.questions, questionId);
      if (!currentQuestion) return;

      const nextProgress = getCurrentProgress();
      const exists = state.answeredQuestions[questionId] !== undefined;
      if (exists) return;

      const isCorrect = answerIndex === currentQuestion.correctIndex;
      state.answeredQuestions[questionId] = answerIndex;

      const moduleReviewQueue = state.reviewQueue[selectedModule.moduleId] ?? [];
      const nextReviewQueue = moduleReviewQueue.filter((id) => id !== questionId);

      if (!isCorrect) {
        nextReviewQueue.push(questionId);
      }

      state.reviewQueue[selectedModule.moduleId] = [...new Set(nextReviewQueue)];

      const seen = nextProgress.seen + 1;
      state.moduleProgress[selectedModule.moduleId] = {
        ...nextProgress,
        seen,
        correct: isCorrect ? nextProgress.correct + 1 : nextProgress.correct,
        lastPracticedAt: new Date().toISOString(),
        status: seen >= currentQuiz.questions.length ? 'completed' : 'in-progress',
      };

      saveCurrentState();
      render();
    });
  });

  document.querySelectorAll('[data-review-question]').forEach((button) => {
    button.addEventListener('click', () => {
      const reviewQuestionId = button.getAttribute('data-review-question');
      if (!reviewQuestionId) return;
      state.currentQuestionId = reviewQuestionId;
      saveCurrentState();
      render();
    });
  });

  document.querySelectorAll('[data-action]').forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.getAttribute('data-action');
      if (!action) return;

      const reviewQueue = getCurrentReviewQueue();

      if (action === 'review-next' && reviewQueue.length > 0) {
        state.currentQuestionId = reviewQueue[0] ?? currentQuiz.questions[0]?.id ?? null;
        saveCurrentState();
        render();
        return;
      }

      if (action === 'exam-mode') {
        const examDeck = buildExamDeck(currentQuiz.questions, reviewQueue, 3);
        state.currentQuestionId = examDeck[0] ?? currentQuiz.questions[0]?.id ?? null;
        saveCurrentState();
        render();
        return;
      }

      state.currentQuestionId = currentQuiz.questions[0]?.id ?? null;
      if (action === 'quick-test') {
        state.currentQuestionId = currentQuiz.questions[1]?.id ?? null;
      }

      saveCurrentState();
      render();
    });
  });
}

render();
