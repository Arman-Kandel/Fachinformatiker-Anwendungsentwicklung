import './styles.css';
import { getModuleCatalog, getModuleIndex, getModuleById, getQuizByModuleId } from './app/content-loader/content-loader';
import { loadAppState, saveAppState } from './app/storage/local-store';
import { escapeHtml } from './lib/html';
import { answerExamQuestion, buildExamDeck, buildModuleOverview, buildModuleProgress, buildReviewQueue, buildStudyAgenda, computeAccuracy, expireExamSession, getExamRemainingSeconds, getExamResult, getMasteryLevel, getQuestionAnswerKey, getQuestionById, startExamSession, updateModuleProgressForAnswer, validateModule } from './lib/learning';
import type { AppState, ExamSession, Module, ModuleOverview, ModuleProgress, Question, StudyAgendaItem } from './types';

const STORAGE_KEY = 'ihk-lernplattform-state-v1';
const EXAM_QUESTION_LIMIT = 3;
const EXAM_DURATION_SECONDS = 5 * 60;
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
  examSession: null,
  retryQuestionId: null,
  lastUpdatedAt: null,
};

const state = loadAppState<AppState>(STORAGE_KEY, defaultState);
const app = document.querySelector('#app') as HTMLElement;
let examTimer: number | null = null;

function safePercentWidth(value: number): number {
  return Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;
}

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
  const derivedQueue = buildReviewQueue(currentQuiz.questions, state.answeredQuestions, selectedModule.moduleId);
  const validQueue = [...new Set([...derivedQueue, ...persistedQueue])].filter((questionId) => currentQuiz.questions.some((question) => question.id === questionId));

  state.reviewQueue[selectedModule.moduleId] = validQueue;
  return validQueue;
}

function getStudyAgenda(): StudyAgendaItem[] {
  const questionIdsByModule: Record<string, string[]> = {};
  const reviewQueues: Record<string, string[]> = {};

  for (const module of moduleCatalog) {
    const questions = getQuizByModuleId(module.moduleId)?.questions ?? [];
    questionIdsByModule[module.moduleId] = questions.map((question) => question.id);
    reviewQueues[module.moduleId] = [...new Set([
      ...buildReviewQueue(questions, state.answeredQuestions, module.moduleId),
      ...(state.reviewQueue[module.moduleId] ?? []),
    ])].filter((id) => questions.some((question) => question.id === id));
  }

  return buildStudyAgenda(moduleCatalog, questionIdsByModule, reviewQueues, state.answeredQuestions, 3, state.moduleProgress);
}

function openAgendaItem(item: StudyAgendaItem): void {
  const module = getModuleById(item.moduleId);
  state.selectedModuleId = item.moduleId;
  state.resumeModuleId = item.moduleId;
  state.studySectionId = module?.sections[0]?.id ?? null;
  state.currentQuestionId = item.questionId;
  state.retryQuestionId = null;
  ensureModuleState(item.moduleId);
  saveCurrentState();
  render();
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
          <span>${escapeHtml(ref.sourceId)}</span>
          <strong>${escapeHtml(ref.section)}</strong>
          <p>${escapeHtml(ref.quote)}</p>
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
    <button class="module-card ${active ? 'active' : ''}" type="button" data-module-id="${escapeHtml(item.moduleId)}">
      <div class="module-topline">
        <span>${escapeHtml(item.difficulty)}</span>
        <span>${escapeHtml(item.estimatedMinutes)} min</span>
      </div>
      <strong>${escapeHtml(item.title)}</strong>
      <small>${escapeHtml(item.sourceRefs[0]?.sourceId ?? 'FIAUSBV')} · ${escapeHtml(overview.mastery)}</small>
      <div class="mini-progress">
        <span style="width: ${safePercentWidth(overview.percent)}%"></span>
      </div>
    </button>
  `;
}

function renderQuestion(question: Question): string {
  const selectedAnswer = state.answeredQuestions[getQuestionAnswerKey(getSelectedModule().moduleId, question.id)];
  const isAnswered = selectedAnswer !== undefined;
  const isRetrying = state.retryQuestionId === question.id;
  const showResult = isAnswered && !isRetrying;
  const canRetry = (state.reviewQueue[getSelectedModule().moduleId] ?? []).includes(question.id);

  return `
    <div class="question-box">
      <div class="question-meta">
        <span>Frage</span>
        <strong>${escapeHtml(question.id.toUpperCase())}</strong>
      </div>
      <h3>${escapeHtml(question.question)}</h3>
      <div class="options">
        ${question.options
          .map((option, index) => {
            const isCorrect = showResult && index === question.correctIndex;
            const isWrong = showResult && index === selectedAnswer && index !== question.correctIndex;
            return `
              <button
                type="button"
                class="answer-option ${isCorrect ? 'correct' : ''} ${isWrong ? 'incorrect' : ''}"
                data-answer-index="${index}"
                data-question-id="${escapeHtml(question.id)}"
                ${isAnswered && !isRetrying ? 'disabled' : ''}
              >
                <span>${String.fromCharCode(65 + index)}</span>
                <span>${escapeHtml(option)}</span>
              </button>
            `;
          })
          .join('')}
      </div>
      ${showResult ? `
        <div class="result-panel">
          <p class="result-label">${selectedAnswer === question.correctIndex ? 'Richtig' : 'Nicht ganz'}</p>
          <p>${escapeHtml(question.explanation)}</p>
          <ul class="source-list">${renderSourceRefs(question.sourceRefs)}</ul>
          ${canRetry ? `<button type="button" data-review-retry="${escapeHtml(question.id)}">Erneut beantworten</button>` : ''}
        </div>
      ` : ''}
    </div>
  `;
}

function formatExamTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function renderExamSession(session: ExamSession): string {
  const module = getModuleById(session.moduleId);
  const quiz = getQuizByModuleId(session.moduleId);
  if (!module || !quiz) {
    return '<section class="panel exam-panel"><p>Diese Prüfung kann nicht mehr geladen werden.</p><button type="button" data-action="close-exam">Schließen</button></section>';
  }

  if (session.status === 'active') {
    const questionId = session.questionIds[session.currentIndex];
    const question = quiz.questions.find((item) => item.id === questionId);
    if (!question) {
      return '<section class="panel exam-panel"><p>Die aktuelle Prüfungsfrage fehlt im Inhalt.</p><button type="button" data-action="close-exam">Prüfung beenden</button></section>';
    }

    const remaining = getExamRemainingSeconds(session, Date.now());
    return `
      <section class="panel exam-panel">
        <div class="section-head">
          <div>
            <p class="eyebrow">Kurzprüfung · 5 Minuten</p>
            <h2>${escapeHtml(module.title)}</h2>
          </div>
          <button type="button" data-action="close-exam">Prüfung abbrechen</button>
        </div>
        <div class="exam-progress-line">
          <span>Frage ${escapeHtml(session.currentIndex + 1)} von ${escapeHtml(session.questionIds.length)}</span>
          <strong data-exam-timer>${escapeHtml(formatExamTime(remaining))}</strong>
        </div>
        <div class="exam-progress-track"><span style="width: ${safePercentWidth((session.currentIndex / session.questionIds.length) * 100)}%"></span></div>
        <div class="question-box">
          <div class="question-meta"><span>Prüfungsfrage</span><strong>${escapeHtml(question.id.toUpperCase())}</strong></div>
          <h3>${escapeHtml(question.question)}</h3>
          <div class="options">
            ${question.options
              .map(
                (option, index) => `
                  <button type="button" class="answer-option" data-exam-answer="${index}">
                    <span>${String.fromCharCode(65 + index)}</span>
                    <span>${escapeHtml(option)}</span>
                  </button>
                `,
              )
              .join('')}
          </div>
        </div>
      </section>
    `;
  }

  const result = getExamResult(session, quiz.questions);
  return `
    <section class="panel exam-panel exam-result">
      <div class="section-head">
        <div>
          <p class="eyebrow">${escapeHtml(session.status === 'expired' ? 'Zeit abgelaufen' : 'Prüfung abgeschlossen')}</p>
          <h2>${escapeHtml(module.title)}</h2>
        </div>
        <button type="button" data-action="close-exam">Zurück zum Lernen</button>
      </div>
      <div class="exam-score">
        <strong>${escapeHtml(result.correct)}<span>/${escapeHtml(result.total)}</span></strong>
        <span>${escapeHtml(result.percent)}% richtig</span>
      </div>
      <div class="exam-review-list">
        ${session.questionIds
          .map((questionId, index) => {
            const question = quiz.questions.find((item) => item.id === questionId);
            if (!question) return '';
            const answerIndex = session.answers[questionId];
            const isCorrect = answerIndex === question.correctIndex;
            return `
              <article class="exam-review-item ${isCorrect ? 'correct' : 'incorrect'}">
                <div class="exam-review-heading"><strong>${escapeHtml(index + 1)}. ${escapeHtml(question.question)}</strong><span>${isCorrect ? 'Richtig' : answerIndex === undefined ? 'Keine Antwort' : 'Falsch'}</span></div>
                <p>Deine Antwort: ${escapeHtml(answerIndex === undefined ? 'Keine Antwort' : question.options[answerIndex] ?? 'Ungültige Auswahl')}</p>
                <p>Richtige Antwort: ${escapeHtml(question.options[question.correctIndex] ?? 'Keine gültige Antwort')}</p>
                <p>${escapeHtml(question.explanation)}</p>
                <ul class="source-list">${renderSourceRefs(question.sourceRefs)}</ul>
              </article>
            `;
          })
          .join('')}
      </div>
    </section>
  `;
}

function saveCurrentState(): void {
  state.lastUpdatedAt = new Date().toISOString();
  saveAppState(STORAGE_KEY, state);
}

function render(): void {
  if (examTimer !== null) {
    window.clearInterval(examTimer);
    examTimer = null;
  }

  const storedExamSession = state.examSession ?? null;
  if (storedExamSession?.status === 'active' && Date.now() >= storedExamSession.deadlineAt) {
    state.examSession = expireExamSession(storedExamSession, Date.now());
    saveCurrentState();
  }

  const examSession = state.examSession ?? null;
  const selectedModule = getSelectedModule();
  const currentQuiz = getCurrentQuiz();
  const currentSection = getCurrentSection();
  const validationErrors = validateModule(selectedModule);
  const progress = getCurrentProgress();
  const reviewQueue = getCurrentReviewQueue();
  const studyAgenda = getStudyAgenda();
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
            <button type="button" data-action="study-today" ${studyAgenda.length === 0 ? 'disabled' : ''}>Heute üben</button>
            <button type="button" data-action="quick-test">Schnelltest</button>
            <button type="button" data-action="exam-mode">Prüfungsmodus</button>
            <button type="button" data-action="review-next" ${reviewQueue.length === 0 ? 'disabled' : ''}>Wiederholen</button>
          </div>
          <p class="summary">
            ${escapeHtml(selectedModule.title)} · ${escapeHtml(computeAccuracy(progress.correct, progress.total))}% Trefferquote · ${escapeHtml(getMasteryLevel(progress).label)} · ${escapeHtml(selectedModule.learningObjectives[0] ?? '')}
          </p>
          ${validationErrors.length > 0 ? `<p class="validation-warning">Warnung: ${escapeHtml(validationErrors.join(', '))}</p>` : ''}
        </section>

        <section class="panel agenda-panel">
          <div class="section-head">
            <div>
              <p class="eyebrow">Nächste Schritte</p>
              <h2>Heute üben</h2>
            </div>
            <span class="pill">${escapeHtml(studyAgenda.length)} Vorschläge</span>
          </div>
          ${studyAgenda.length > 0 ? `
            <div class="agenda-list">
              ${studyAgenda
                .map(
                  (item, index) => `
                    <button class="agenda-item" type="button" data-agenda-module="${escapeHtml(item.moduleId)}" data-agenda-question="${escapeHtml(item.questionId)}">
                      <span class="agenda-order">${escapeHtml(String(index + 1).padStart(2, '0'))}</span>
                      <span class="agenda-copy">
                        <strong>${escapeHtml(item.title)}</strong>
                        <small>${escapeHtml(item.kind === 'review' ? `Wiederholen · ${item.pendingCount} offen` : `Weiterlernen · ${item.pendingCount} unbeantwortet`)}</small>
                      </span>
                      <span class="agenda-arrow" aria-hidden="true">→</span>
                    </button>
                  `,
                )
                .join('')}
            </div>
          ` : '<p>Alles erledigt. Neue Module oder Fragen erscheinen hier, sobald Inhalte verfügbar sind.</p>'}
        </section>

        <section class="panel">
          <div class="section-head">
            <h2>Module</h2>
            <span class="pill">${escapeHtml(moduleCatalog.length)} Inhalte</span>
          </div>
          <div class="overview-strip">
            ${buildModuleOverview(moduleCatalog, state.moduleProgress)
              .map(
                (entry) => `
                  <div class="overview-pill ${entry.status === 'completed' ? 'done' : ''}">
                    <span>${escapeHtml(entry.title)}</span>
                    <strong>${escapeHtml(entry.percent)}%</strong>
                  </div>
                `,
              )
              .join('')}
          </div>
          <div class="module-grid">
            ${moduleIndex.map(renderModuleCard).join('')}
          </div>
        </section>

        ${examSession ? renderExamSession(examSession) : ''}

        <section class="panel practice ${examSession ? 'session-paused' : ''}">
          <div class="section-head">
            <div>
              <p class="eyebrow">Lernmodul</p>
              <h2>${escapeHtml(selectedModule.title)}</h2>
            </div>
            <span class="pill">${escapeHtml(selectedModule.exam)}</span>
          </div>

          <div class="stat-row">
            <div class="stat-box">
              <span>Fortschritt</span>
              <strong>${escapeHtml(progress.seen)}/${escapeHtml(progress.total)}</strong>
            </div>
            <div class="stat-box">
              <span>Genauigkeit</span>
              <strong>${escapeHtml(computeAccuracy(progress.correct, progress.total))}%</strong>
            </div>
            <div class="stat-box">
              <span>Schwierigkeit</span>
              <strong>${escapeHtml(selectedModule.difficulty)}</strong>
            </div>
          </div>

          <div class="mastery-panel">
            <div class="section-head compact">
              <h3>Mastery</h3>
              <span class="pill">${escapeHtml(getMasteryLevel(progress).label)}</span>
            </div>
            <div class="mastery-bar">
              <span style="width: ${safePercentWidth(getMasteryLevel(progress).percent)}%"></span>
            </div>
          </div>

          <div class="study-panel">
            <div class="section-head compact">
              <h3>Lernabschnitte</h3>
              <span class="pill">${escapeHtml(selectedModule.sections.length)} Abschnitte</span>
            </div>
            <div class="study-grid">
              ${selectedModule.sections
                .map(
                  (section) => `
                    <button
                      type="button"
                      class="study-card ${section.id === state.studySectionId ? 'active' : ''}"
                      data-section-id="${escapeHtml(section.id)}"
                    >
                      <span>${escapeHtml(section.type)}</span>
                      <strong>${escapeHtml(section.title)}</strong>
                    </button>
                  `,
                )
                .join('')}
            </div>
            ${currentSection ? `
              <article class="section-detail">
                <div class="section-header">
                  <span>${escapeHtml(currentSection.type)}</span>
                  <strong>${escapeHtml(currentSection.title)}</strong>
                </div>
                <p>${escapeHtml(currentSection.content)}</p>
                <ul class="source-list">${renderSourceRefs(currentSection.sourceRefs)}</ul>
              </article>
            ` : ''}
          </div>

          <div class="review-box">
            <div class="section-head compact">
              <h3>Wiederholungs-Queue</h3>
              <span class="pill">${escapeHtml(reviewQueue.length)} offen</span>
            </div>
            ${reviewQueue.length > 0 ? `
              <div class="review-list">
                ${reviewQueue
                  .map(
                    (questionId, index) => `
                      <button type="button" class="review-item" data-review-question="${escapeHtml(questionId)}">
                        <span>${escapeHtml(index + 1)}</span>
                        <strong>${escapeHtml(questionId.toUpperCase())}</strong>
                      </button>
                    `,
                  )
                  .join('')}
              </div>
            ` : '<p>Keine offenen Wiederholungen.</p>'}
          </div>

          <div class="objective-list">
            ${selectedModule.learningObjectives.map((objective) => `<li>${escapeHtml(objective)}</li>`).join('')}
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
      state.retryQuestionId = null;
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
      const answerKey = getQuestionAnswerKey(selectedModule.moduleId, questionId);
      const previousAnswer = state.answeredQuestions[answerKey];
      const isRetry = state.retryQuestionId === questionId;
      if (previousAnswer !== undefined && !isRetry) return;

      const isCorrect = answerIndex === currentQuestion.correctIndex;
      state.answeredQuestions[answerKey] = answerIndex;
      state.retryQuestionId = null;

      const moduleReviewQueue = state.reviewQueue[selectedModule.moduleId] ?? [];
      const nextReviewQueue = moduleReviewQueue.filter((id) => id !== questionId);

      if (!isCorrect) {
        nextReviewQueue.push(questionId);
      }

      state.reviewQueue[selectedModule.moduleId] = [...new Set(nextReviewQueue)];

      state.moduleProgress[selectedModule.moduleId] = updateModuleProgressForAnswer(
        nextProgress,
        previousAnswer,
        answerIndex,
        currentQuestion.correctIndex,
        new Date().toISOString(),
      );

      saveCurrentState();
      render();
    });
  });

  document.querySelectorAll('[data-review-question]').forEach((button) => {
    button.addEventListener('click', () => {
      const reviewQuestionId = button.getAttribute('data-review-question');
      if (!reviewQuestionId) return;
      state.currentQuestionId = reviewQuestionId;
      state.retryQuestionId = null;
      saveCurrentState();
      render();
    });
  });

  document.querySelectorAll('[data-review-retry]').forEach((button) => {
    button.addEventListener('click', () => {
      const retryQuestionId = button.getAttribute('data-review-retry');
      if (!retryQuestionId || !getCurrentReviewQueue().includes(retryQuestionId)) return;
      state.currentQuestionId = retryQuestionId;
      state.retryQuestionId = retryQuestionId;
      saveCurrentState();
      render();
    });
  });

  document.querySelectorAll('[data-agenda-module]').forEach((button) => {
    button.addEventListener('click', () => {
      const moduleId = button.getAttribute('data-agenda-module');
      const questionId = button.getAttribute('data-agenda-question');
      const item = studyAgenda.find((entry) => entry.moduleId === moduleId && entry.questionId === questionId);
      if (item) openAgendaItem(item);
    });
  });

  document.querySelectorAll('[data-exam-answer]').forEach((button) => {
    button.addEventListener('click', () => {
      const session = state.examSession;
      const questionId = session?.questionIds[session.currentIndex];
      const answerIndex = Number(button.getAttribute('data-exam-answer'));
      if (!session || !questionId || Number.isNaN(answerIndex)) return;

      state.examSession = answerExamQuestion(session, questionId, answerIndex, Date.now());
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
        const examDeck = buildExamDeck(currentQuiz.questions, reviewQueue, EXAM_QUESTION_LIMIT);
        state.examSession = startExamSession(selectedModule.moduleId, examDeck, Date.now(), EXAM_DURATION_SECONDS);
        saveCurrentState();
        render();
        return;
      }

      if (action === 'close-exam') {
        state.examSession = null;
        saveCurrentState();
        render();
        return;
      }

      if (action === 'study-today') {
        const firstAgendaItem = studyAgenda[0];
        if (firstAgendaItem) openAgendaItem(firstAgendaItem);
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

  const activeSession = state.examSession;
  if (activeSession?.status === 'active') {
    examTimer = window.setInterval(() => {
      const session = state.examSession;
      if (!session || session.status !== 'active') return;

      const remaining = getExamRemainingSeconds(session, Date.now());
      const timerElement = app.querySelector('[data-exam-timer]');
      if (timerElement) timerElement.textContent = formatExamTime(remaining);

      if (remaining === 0) {
        state.examSession = expireExamSession(session, Date.now());
        saveCurrentState();
        render();
      }
    }, 1_000);
  }
}

render();
