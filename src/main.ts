import './styles.css';
import ap1Index from '../content/ap1/index.json';
import moduleData from '../content/ap1/01-datenmodellierung/module.json';
import quizData from '../content/ap1/01-datenmodellierung/quiz.json';
import { buildModuleProgress, computeAccuracy, getQuestionById, validateModule } from './lib/learning';
import type { AppState, Module, ModuleProgress, Question, QuizSet } from './types';

const STORAGE_KEY = 'ihk-lernplattform-state-v1';
const moduleCatalog = ap1Index.modules as Array<{ moduleId: string; title: string; difficulty: string; estimatedMinutes: number; sourceRefs: Array<{ sourceId: string; quote: string; section: string; type?: string }> }>;
const module = moduleData as Module;
const quiz = quizData as QuizSet;

const defaultState: AppState = {
  resumeModuleId: module.moduleId,
  currentQuestionId: quiz.questions[0]?.id ?? null,
  selectedModuleId: module.moduleId,
  moduleProgress: {},
  answeredQuestions: {},
  lastUpdatedAt: null,
};

function readState(): AppState {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return defaultState;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AppState>;
    return {
      ...defaultState,
      ...parsed,
      moduleProgress: parsed.moduleProgress ?? {},
      answeredQuestions: parsed.answeredQuestions ?? {},
    };
  } catch {
    return defaultState;
  }
}

const state: AppState = readState();

function saveState(): void {
  state.lastUpdatedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getSelectedModule(): Module {
  return module;
}

function getCurrentProgress(): ModuleProgress {
  const selectedModule = getSelectedModule();
  const progress = state.moduleProgress[selectedModule.moduleId] ?? buildModuleProgress(
    selectedModule.moduleId,
    quiz.questions.length,
    0,
    0,
    new Date().toISOString(),
  );

  state.moduleProgress[selectedModule.moduleId] = progress;
  return progress;
}

function chooseQuestion(questionId: string | null): Question | null {
  return getQuestionById(quiz.questions, questionId);
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

function renderModuleCard(item: (typeof moduleCatalog)[number]): string {
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
  const statusClass = isAnswered
    ? selectedAnswer === question.correctIndex
      ? 'correct'
      : 'incorrect'
    : '';

  return `
    <div class="question-box ${statusClass}">
      <div class="question-meta">
        <span>Frage</span>
        <strong>${question.id.toUpperCase()}</strong>
      </div>
      <h3>${question.question}</h3>
      <div class="options">
        ${question.options
          .map(
            (option, index) => `
              <button
                type="button"
                class="answer-option ${isAnswered && index === question.correctIndex ? 'correct' : ''} ${isAnswered && index === selectedAnswer && index !== question.correctIndex ? 'incorrect' : ''}"
                data-answer-index="${index}"
                data-question-id="${question.id}"
                ${isAnswered ? 'disabled' : ''}
              >
                <span>${String.fromCharCode(65 + index)}</span>
                <span>${option}</span>
              </button>
            `,
          )
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

function render(): void {
  const selectedModule = getSelectedModule();
  const validationErrors = validateModule(selectedModule);
  const progress = getCurrentProgress();
  const currentQuestion = chooseQuestion(state.currentQuestionId);

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
            ${moduleCatalog.map(renderModuleCard).join('')}
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
      state.currentQuestionId = quiz.questions[0]?.id ?? null;
      saveState();
      render();
    });
  });

  document.querySelectorAll('[data-answer-index]').forEach((button) => {
    button.addEventListener('click', () => {
      const questionId = button.getAttribute('data-question-id');
      const answerIndex = Number(button.getAttribute('data-answer-index'));
      if (!questionId || Number.isNaN(answerIndex)) return;

      const currentQuestion = chooseQuestion(questionId);
      if (!currentQuestion) return;

      const nextProgress = getCurrentProgress();
      const alreadyAnswered = state.answeredQuestions[questionId] !== undefined;
      if (alreadyAnswered) return;

      const isCorrect = answerIndex === currentQuestion.correctIndex;
      state.answeredQuestions[questionId] = answerIndex;
      state.moduleProgress[module.moduleId] = {
        ...nextProgress,
        seen: nextProgress.seen + 1,
        correct: isCorrect ? nextProgress.correct + 1 : nextProgress.correct,
        lastPracticedAt: new Date().toISOString(),
        status: nextProgress.seen + 1 >= quiz.questions.length ? 'completed' : 'in-progress',
      };

      saveState();
      render();
    });
  });

  document.querySelectorAll('[data-action]').forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.getAttribute('data-action');
      if (action === 'resume') {
        state.currentQuestionId = quiz.questions[0]?.id ?? null;
        saveState();
        render();
      }
      if (action === 'study-today') {
        state.currentQuestionId = quiz.questions[0]?.id ?? null;
        saveState();
        render();
      }
      if (action === 'quick-test') {
        state.currentQuestionId = quiz.questions[1]?.id ?? null;
        saveState();
        render();
      }
    });
  });
}

const app = document.querySelector('#app') as HTMLElement;
render();
