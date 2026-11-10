import './styles.css';
import { getModuleCatalog, getModuleIndex, getModuleById, getQuizByModuleId } from './app/content-loader/content-loader';
import { loadAppState, saveAppState } from './app/storage/local-store';
import { buildModuleProgress, computeAccuracy, getQuestionById, validateModule } from './lib/learning';
import type { AppState, Module, ModuleProgress, Question } from './types';

const STORAGE_KEY = 'ihk-lernplattform-state-v1';
const moduleCatalog = getModuleCatalog();
const moduleIndex = getModuleIndex();
const firstModule = moduleCatalog[0];
const defaultState: AppState = {
  resumeModuleId: firstModule?.moduleId ?? null,
  currentQuestionId: getQuizByModuleId(firstModule?.moduleId ?? '')?.questions[0]?.id ?? null,
  selectedModuleId: firstModule?.moduleId ?? null,
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
  return `
    <button class="module-card ${active ? 'active' : ''}" type="button" data-module-id="${item.moduleId}">
      <div class="module-topline">
        <span>${item.difficulty}</span>
        <span>${item.estimatedMinutes} min</span>
      </div>
      <strong>${item.title}</strong>
      <small>${item.sourceRefs[0]?.sourceId ?? 'FIAUSBV'}</small>
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
  const validationErrors = validateModule(selectedModule);
  const progress = getCurrentProgress();
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
          </div>
          <p class="summary">
            ${selectedModule.title} · ${computeAccuracy(progress.correct, progress.total)}% Trefferquote · ${selectedModule.learningObjectives[0]}
          </p>
          ${validationErrors.length > 0 ? `<p class="validation-warning">Warnung: ${validationErrors.join(', ')}</p>` : ''}
        </section>

        <section class="panel">
          <div class="section-head">
            <h2>Module</h2>
            <span class="pill">${moduleCatalog.length} Inhalte</span>
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
      state.selectedModuleId = nextId;
      state.resumeModuleId = nextId;
      const nextQuiz = getQuizByModuleId(nextId);
      state.currentQuestionId = nextQuiz?.questions[0]?.id ?? null;
      ensureModuleState(nextId);
      saveCurrentState();
      render();
    });
  });

  document.querySelectorAll('[data-answer-index]').forEach((button) => {
    button.addEventListener('click', () => {
      const questionId = button.getAttribute('data-question-id');
      const answerIndex = Number(button.getAttribute('data-answer-index'));
      if (!questionId || Number.isNaN(answerIndex)) return;

      const currentQuestion = getQuestionById(currentQuiz.questions, questionId);
      if (!currentQuestion) return;

      const nextProgress = getCurrentProgress();
      const exists = state.answeredQuestions[questionId] !== undefined;
      if (exists) return;

      const isCorrect = answerIndex === currentQuestion.correctIndex;
      state.answeredQuestions[questionId] = answerIndex;
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

  document.querySelectorAll('[data-action]').forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.getAttribute('data-action');
      if (!action) return;

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
