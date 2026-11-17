import './styles.css';
import { getApprovedSourceUrl, getModuleCatalog, getModuleIndex, getModuleById, getQuizByModuleId } from './app/content-loader/content-loader';
import { loadAppState, normalizeAppState, parseAppStateExport, saveAppState, serializeAppState } from './app/storage/local-store';
import { escapeHtml, renderSimpleMarkdown } from './lib/html';
import { sound, confetti, triggerRewardPill } from './lib/juice';
import featuresMarkdown from '../FEATURES.md?raw';
import versionsMarkdown from '../VERSIONS.md?raw';
import {
  answerExamQuestion,
  buildExamDeck,
  buildModuleOverview,
  buildModuleProgress,
  buildReviewQueue,
  buildStudyAgenda,
  computeAccuracy,
  expireExamSession,
  getExamRemainingSeconds,
  getExamResult,
  getMasteryLevel,
  getQuestionAnswerKey,
  getQuestionById,
  startExamSession,
  updateModuleProgressForAnswer,
  validateModule,
} from './lib/learning';
import type { AppState, ExamSession, Module, ModuleOverview, ModuleProgress, Question, StudyAgendaItem } from './types';

const STORAGE_KEY = 'ihk-lernplattform-state-v1';
const EXAM_QUESTION_LIMIT = 3;
const EXAM_DURATION_SECONDS = 5 * 60;
const MAX_STATE_IMPORT_BYTES = 1_000_000;
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

const state = loadAppState<AppState>(STORAGE_KEY, defaultState, normalizeAppState);
const app = document.querySelector('#app') as HTMLElement;
let examTimer: number | null = null;
let toastNotice = '';
let toastTimer: number | null = null;
let activeView: 'dashboard' | 'settings' = 'dashboard';
let activeSidebarTab: 'modules' | 'agenda' = 'modules';
let activeStageTab: 'quiz' | 'theory' | 'sources' = 'quiz';
let streak = 0;
let xp = Number(localStorage.getItem('ihk-xp') || 0);

function safePercentWidth(value: number): number {
  return Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;
}

function showToast(msg: string): void {
  toastNotice = msg;
  if (toastTimer !== null) {
    window.clearTimeout(toastTimer);
  }
  toastTimer = window.setTimeout(() => {
    toastNotice = '';
    const el = document.querySelector('.toast-notice');
    if (el) el.remove();
  }, 3200);
  render();
}

function ensureModuleState(moduleId: string): void {
  const module = getModuleById(moduleId);
  const quiz = getQuizByModuleId(moduleId);

  if (!module || !quiz) return;

  if (!state.moduleProgress[moduleId]) {
    state.moduleProgress[moduleId] = buildModuleProgress(moduleId, quiz.questions.length, 0, 0, new Date().toISOString());
  }
}

function getSelectedModule(): Module {
  const selectedId = state.selectedModuleId ?? firstModule?.moduleId ?? null;
  if (!selectedId) throw new Error('No module available');

  const selectedModule = getModuleById(selectedId);
  if (!selectedModule) throw new Error(`Module not found: ${selectedId}`);

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
  const validQueue = [...new Set([...derivedQueue, ...persistedQueue])].filter((questionId) =>
    currentQuiz.questions.some((question) => question.id === questionId)
  );

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
  activeStageTab = 'quiz';
  activeView = 'dashboard';
  ensureModuleState(item.moduleId);
  saveCurrentState();
  sound.playClick();
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
    .map((ref) => {
      const sourceUrl = getApprovedSourceUrl(ref.sourceId);
      const sourceLink = sourceUrl
        ? `<a href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener noreferrer">Originalquelle öffnen ↗</a>`
        : '<span>Quelle nicht im Register</span>';

      return `
        <li>
          <strong>${escapeHtml(ref.sourceId)} · ${escapeHtml(ref.section)}</strong>
          <p>"${escapeHtml(ref.quote)}"</p>
          ${sourceLink}
        </li>
      `;
    })
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
        <span class="module-tag">${escapeHtml(item.difficulty)}</span>
        <span>${escapeHtml(item.estimatedMinutes)} min</span>
      </div>
      <strong>${escapeHtml(item.title)}</strong>
      <small>${escapeHtml(overview.mastery.toUpperCase())} · ${escapeHtml(overview.percent)}%</small>
      <div class="mini-progress">
        <span style="width: ${safePercentWidth(overview.percent)}%"></span>
      </div>
    </button>
  `;
}

function renderQuestion(question: Question): string {
  const selectedModule = getSelectedModule();
  const currentQuiz = getCurrentQuiz();
  const selectedAnswer = state.answeredQuestions[getQuestionAnswerKey(selectedModule.moduleId, question.id)];
  const isAnswered = selectedAnswer !== undefined;
  const isRetrying = state.retryQuestionId === question.id;
  const showResult = isAnswered && !isRetrying;
  const canRetry = (state.reviewQueue[selectedModule.moduleId] ?? []).includes(question.id);
  const isCorrect = showResult && selectedAnswer === question.correctIndex;

  const currentIndex = currentQuiz.questions.findIndex((q) => q.id === question.id);
  const hasNextQuestion = currentIndex >= 0 && currentIndex < currentQuiz.questions.length - 1;

  return `
    <div class="quiz-wrapper">
      <div class="quiz-stepper">
        <span>Frage ${currentIndex + 1} von ${currentQuiz.questions.length}</span>
        <div class="stepper-dots">
          ${currentQuiz.questions
            .map((q) => {
              const ansKey = getQuestionAnswerKey(selectedModule.moduleId, q.id);
              const ans = state.answeredQuestions[ansKey];
              let statusClass = '';
              if (q.id === question.id) statusClass = 'active';
              else if (ans !== undefined) statusClass = ans === q.correctIndex ? 'done' : 'wrong';
              return `<span class="step-dot ${statusClass}"></span>`;
            })
            .join('')}
        </div>
        <span class="pill">${escapeHtml(question.id.toUpperCase())}</span>
      </div>

      <div class="question-box ${showResult ? (isCorrect ? 'celebrate-glow' : 'shake-animation') : ''}">
        <div class="question-prompt">${escapeHtml(question.question)}</div>
        <div class="options-grid">
          ${question.options
            .map((option, index) => {
              const optionCorrect = showResult && index === question.correctIndex;
              const optionWrong = showResult && index === selectedAnswer && index !== question.correctIndex;
              return `
                <button
                  type="button"
                  class="answer-option ${optionCorrect ? 'correct' : ''} ${optionWrong ? 'incorrect' : ''}"
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
          <div class="result-feedback-card ${isCorrect ? 'correct-feedback' : 'incorrect-feedback'}">
            <div class="feedback-headline">
              <strong>${isCorrect ? '✨ Fantastisch! Richtig beantwortet' : '💡 Nicht ganz richtig'}</strong>
              ${isCorrect ? `<span class="pill" style="border-color: var(--green); color: var(--green);">+${50 * Math.max(1, streak)} XP</span>` : ''}
            </div>
            <p class="feedback-text">${escapeHtml(question.explanation)}</p>
            <div class="feedback-actions">
              ${hasNextQuestion ? `<button type="button" class="primary" data-action="next-question">Nächste Frage →</button>` : ''}
              ${canRetry ? `<button type="button" data-review-retry="${escapeHtml(question.id)}">Erneut beantworten ↺</button>` : ''}
            </div>
          </div>
        ` : ''}
      </div>
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
    return `
      <div class="exam-view-wrapper">
        <p>Diese Prüfung kann nicht mehr geladen werden.</p>
        <button type="button" data-action="close-exam">Schließen</button>
      </div>
    `;
  }

  if (session.status === 'active') {
    const questionId = session.questionIds[session.currentIndex];
    const question = quiz.questions.find((item) => item.id === questionId);
    if (!question) {
      return `
        <div class="exam-view-wrapper">
          <p>Die aktuelle Prüfungsfrage fehlt im Inhalt.</p>
          <button type="button" data-action="close-exam">Prüfung beenden</button>
        </div>
      `;
    }

    const remaining = getExamRemainingSeconds(session, Date.now());
    return `
      <div class="exam-view-wrapper">
        <div class="exam-timer-bar">
          <div>
            <span class="pill" style="border-color: var(--green); color: var(--green);">Prüfung läuft</span>
            <strong style="margin-left: 8px;">${escapeHtml(module.title)}</strong>
          </div>
          <div class="exam-timer-clock" data-exam-timer>${escapeHtml(formatExamTime(remaining))}</div>
          <button type="button" data-action="close-exam">Abbrechen</button>
        </div>

        <div class="quiz-stepper">
          <span>Frage ${session.currentIndex + 1} von ${session.questionIds.length}</span>
          <div class="mini-progress" style="width: 140px;">
            <span style="width: ${safePercentWidth((session.currentIndex / session.questionIds.length) * 100)}%"></span>
          </div>
        </div>

        <div class="question-box">
          <div class="question-prompt">${escapeHtml(question.question)}</div>
          <div class="options-grid">
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
      </div>
    `;
  }

  const result = getExamResult(session, quiz.questions);
  return `
    <div class="exam-view-wrapper">
      <div class="exam-result-hero">
        <span class="pill">${escapeHtml(session.status === 'expired' ? 'Zeit abgelaufen' : 'Prüfung bestanden')}</span>
        <div class="exam-score-big">${escapeHtml(result.percent)}%</div>
        <p style="margin: 0; color: #e0d4ff;">${escapeHtml(result.correct)} von ${escapeHtml(result.total)} Fragen richtig</p>
        <button type="button" class="primary" data-action="close-exam" style="margin-top: 10px;">Zurück zum Lernbereich</button>
      </div>

      <div class="sidebar-scrollable" style="flex: 1;">
        ${session.questionIds
          .map((questionId, index) => {
            const question = quiz.questions.find((item) => item.id === questionId);
            if (!question) return '';
            const answerIndex = session.answers[questionId];
            const isCorrect = answerIndex === question.correctIndex;
            return `
              <div class="result-feedback-card ${isCorrect ? 'correct-feedback' : 'incorrect-feedback'}">
                <div class="feedback-headline">
                  <strong>${index + 1}. ${escapeHtml(question.question)}</strong>
                  <span class="pill">${isCorrect ? 'Richtig' : 'Falsch'}</span>
                </div>
                <p class="feedback-text">Deine Antwort: ${escapeHtml(answerIndex === undefined ? 'Keine' : question.options[answerIndex] ?? '')}</p>
                <p class="feedback-text" style="color: var(--green);">Korrekt: ${escapeHtml(question.options[question.correctIndex] ?? '')}</p>
                <p class="feedback-text">${escapeHtml(question.explanation)}</p>
              </div>
            `;
          })
          .join('')}
      </div>
    </div>
  `;
}

function saveCurrentState(): void {
  state.lastUpdatedAt = new Date().toISOString();
  saveAppState(STORAGE_KEY, state);
}

async function restoreStateFromFile(file: File): Promise<void> {
  if (file.size > MAX_STATE_IMPORT_BYTES) {
    showToast('Datei ist zu groß (> 1MB).');
    return;
  }

  try {
    const imported = parseAppStateExport(await file.text(), defaultState);
    if (!imported) {
      showToast('Ungültiges Format.');
      return;
    }

    const importedModule = imported.selectedModuleId ? getModuleById(imported.selectedModuleId) : firstModule;
    const importedQuiz = importedModule ? getQuizByModuleId(importedModule.moduleId) : undefined;
    const validSelection = !imported.selectedModuleId || importedModule !== undefined;
    const validQuestion = !imported.currentQuestionId || importedQuiz?.questions.some((question) => question.id === imported.currentQuestionId) === true;
    const importedExamModule = imported.examSession ? getModuleById(imported.examSession.moduleId) : undefined;
    const importedExamQuiz = importedExamModule ? getQuizByModuleId(importedExamModule.moduleId) : undefined;
    const validExam = !imported.examSession || (importedExamQuiz !== undefined
      && imported.examSession.questionIds.every((questionId) => importedExamQuiz.questions.some((question) => question.id === questionId)));

    if (!validSelection || !validQuestion || !validExam) {
      showToast('Inhalte in dieser Version nicht verfügbar.');
      return;
    }

    if (!window.confirm('Aktuelle Daten mit importiertem Stand überschreiben?')) {
      return;
    }

    Object.assign(state, imported);
    saveCurrentState();
    sound.playSuccess(2);
    showToast('Lernstand erfolgreich importiert! 📂');
  } catch {
    showToast('Datei konnte nicht gelesen werden.');
  }
}

function downloadCurrentState(): void {
  const blob = new Blob([serializeAppState(state)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `ihk-lernplattform-state-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
  sound.playClick();
  showToast('Lernstand als JSON exportiert! 💾');
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
  const mastery = getMasteryLevel(progress);
  ensureModuleState(selectedModule.moduleId);

  app.innerHTML = `
    <div class="app-shell">
      <header class="page-header">
        <div class="brand-section">
          <div class="brand-logo">⚡</div>
          <div class="brand-title">
            <h1>IHK Master</h1>
            <span>FIAU Prüfungstrainer</span>
          </div>
        </div>

        <div class="dopamine-hud">
          <div class="hud-item hud-streak ${streak > 0 ? 'fire-active' : ''}" title="Aktuelle Serie richtiger Antworten">
            <span>🔥</span>
            <span>${streak} Streak</span>
          </div>
          <div class="hud-item hud-xp" title="Erspielte Erfahrungspunkte">
            <span>⭐</span>
            <span>${xp} XP</span>
          </div>
          <div class="hud-item hud-mastery" title="Mastery-Level">
            <span>🏆</span>
            <span>${escapeHtml(mastery.label)} (${mastery.percent}%)</span>
          </div>
        </div>

        <div class="header-actions">
          ${activeView === 'settings' ? `
            <button class="primary" type="button" data-action="close-settings">← Dashboard</button>
          ` : `
            <button class="primary" type="button" data-action="quick-test" title="Schnelle Trainingsfrage">🚀 Schnelltest</button>
            <button type="button" data-action="exam-mode" title="5-Minuten Prüfungssimulation">⏱️ Prüfung</button>
            <button type="button" data-action="export-state" title="Lernstand als JSON sichern">💾</button>
            <button type="button" data-action="import-state" title="Lernstand aus JSON wiederherstellen">📂</button>
            <button class="icon-btn" type="button" data-action="toggle-sound" title="${sound.isMuted() ? 'Sound aktivieren' : 'Sound stummstellen'}">
              ${sound.isMuted() ? '🔇' : '🔊'}
            </button>
            <button type="button" class="icon-btn" data-action="open-settings" title="Einstellungen & Dokumentation">⚙️</button>
          `}
          <input type="file" accept="application/json,.json" data-state-import-input hidden>
        </div>
      </header>

      ${activeView === 'settings' ? `
        <!-- SETTINGS PAGE (ONLY VIEW WITH SCROLLING PERMITTED) -->
        <main class="settings-page">
          <div class="settings-card">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <h2>⚙️ Einstellungen & System</h2>
              <button type="button" class="primary" data-action="close-settings">← Zurück zum Dashboard</button>
            </div>

            <div class="settings-row">
              <div class="settings-label">
                <strong>Sound-Effekte & Synthesizer</strong>
                <small>Echtzeit-Audio-Chimes und Fanfaren bei korrekten Antworten und Abschlüssen</small>
              </div>
              <button type="button" data-action="toggle-sound">
                ${sound.isMuted() ? '🔇 Stummgeschaltet' : '🔊 Aktiviert'}
              </button>
            </div>

            <div class="settings-row">
              <div class="settings-label">
                <strong>Lernstand sichern & übertragen</strong>
                <small>Exportiere oder importiere deinen Fortschritt als validierte JSON-Datei</small>
              </div>
              <div style="display: flex; gap: 8px;">
                <button type="button" data-action="export-state">💾 Exportieren</button>
                <button type="button" data-action="import-state">📂 Importieren</button>
              </div>
            </div>

            <div class="settings-row">
              <div class="settings-label">
                <strong>Lernstand zurücksetzen</strong>
                <small>Löscht alle gespeicherten Antworten, Queues und XP aus dem lokalen Browser-Speicher</small>
              </div>
              <button type="button" data-action="reset-state" style="border-color: var(--red); color: var(--red);">
                ⚠️ Alles zurücksetzen
              </button>
            </div>
          </div>

          <!-- GANZ UNTEN: BEIDE MARKDOWN DATEIEN -->
          <div class="settings-card">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <h3>✨ Features & Goodies (FEATURES.md)</h3>
              <span class="pill">Dokumentation</span>
            </div>
            <div class="markdown-doc">
              ${renderSimpleMarkdown(featuresMarkdown)}
            </div>
          </div>

          <div class="settings-card">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <h3>📋 Versionsliste & Changelog (VERSIONS.md)</h3>
              <span class="pill">Changelog</span>
            </div>
            <div class="markdown-doc">
              ${renderSimpleMarkdown(versionsMarkdown)}
            </div>
          </div>
        </main>
      ` : `
        <!-- DASHBOARD (STRICT SINGLE PAGE 100vh, NO WINDOW SCROLLING) -->
        <main class="layout">
          <!-- LEFT SIDEBAR -->
          <aside class="sidebar-panel">
            <nav class="sidebar-nav">
              <button class="nav-tab-btn ${activeSidebarTab === 'modules' ? 'active' : ''}" type="button" data-sidebar-tab="modules">
                Module (${moduleCatalog.length})
              </button>
              <button class="nav-tab-btn ${activeSidebarTab === 'agenda' ? 'active' : ''}" type="button" data-sidebar-tab="agenda">
                Heute üben (${studyAgenda.length})
              </button>
            </nav>

            <div class="sidebar-scrollable">
              ${activeSidebarTab === 'modules' ? `
                ${moduleIndex.map(renderModuleCard).join('')}
              ` : `
                ${studyAgenda.length > 0 ? studyAgenda.map((item, index) => `
                  <button class="agenda-item" type="button" data-agenda-module="${escapeHtml(item.moduleId)}" data-agenda-question="${escapeHtml(item.questionId)}">
                    <span class="agenda-order">${String(index + 1).padStart(2, '0')}</span>
                    <div class="agenda-copy">
                      <strong>${escapeHtml(item.title)}</strong>
                      <small>${escapeHtml(item.kind === 'review' ? `Wiederholen (${item.pendingCount})` : `Weiterlernen (${item.pendingCount})`)}</small>
                    </div>
                    <span class="agenda-arrow">→</span>
                  </button>
                `).join('') : '<p style="padding: 12px; font-size: 0.82rem; color: var(--purple-soft);">Alle Tagesaufgaben erledigt! 🎉</p>'}
              `}
            </div>

            <div class="sidebar-footer">
              <div class="footer-stat-row">
                <span>Genauigkeit:</span>
                <strong>${computeAccuracy(progress.correct, progress.total)}%</strong>
              </div>
              <div class="footer-stat-row">
                <span>Fragen gelöst:</span>
                <strong>${progress.seen}/${progress.total}</strong>
              </div>
              <button
                class="review-badge-btn"
                type="button"
                data-action="review-next"
                ${reviewQueue.length === 0 ? 'disabled' : ''}
              >
                <span>🔄 Wiederholungs-Queue</span>
                <strong>${reviewQueue.length}</strong>
              </button>
              <button
                type="button"
                data-action="open-settings"
                style="background: transparent; border: none; font-size: 0.72rem; color: var(--purple-soft); padding: 4px 0 0 0; cursor: pointer; text-decoration: underline; text-align: center; width: 100%;"
              >
                ⚙️ Einstellungen, Features & Changelog
              </button>
            </div>
          </aside>

          <!-- RIGHT STAGE -->
          <section class="stage-panel">
            ${examSession ? renderExamSession(examSession) : `
              <div class="stage-header">
                <div class="stage-title-wrap">
                  <span class="pill" style="border-color: var(--purple-bright);">${escapeHtml(selectedModule.exam)}</span>
                  <h2>${escapeHtml(selectedModule.title)}</h2>
                </div>
                <div class="stage-tabs">
                  <button class="stage-tab-btn ${activeStageTab === 'quiz' ? 'active' : ''}" type="button" data-stage-tab="quiz">
                    🎯 Quiz
                  </button>
                  <button class="stage-tab-btn ${activeStageTab === 'theory' ? 'active' : ''}" type="button" data-stage-tab="theory">
                    📖 Theorie (${selectedModule.sections.length})
                  </button>
                  <button class="stage-tab-btn ${activeStageTab === 'sources' ? 'active' : ''}" type="button" data-stage-tab="sources">
                    📑 Quellen
                  </button>
                </div>
              </div>

              <div class="stage-content-area">
                ${activeStageTab === 'quiz' ? `
                  ${currentQuestion ? renderQuestion(currentQuestion) : '<p>Keine Fragen für dieses Modul verfügbar.</p>'}
                ` : activeStageTab === 'theory' ? `
                  <div class="theory-wrapper">
                    <div class="theory-section-selector">
                      ${selectedModule.sections.map((sec) => `
                        <button
                          type="button"
                          class="theory-pill-btn ${sec.id === state.studySectionId ? 'active' : ''}"
                          data-section-id="${escapeHtml(sec.id)}"
                        >
                          ${escapeHtml(sec.title)}
                        </button>
                      `).join('')}
                    </div>
                    ${currentSection ? `
                      <div class="theory-reader-card">
                        <h3>${escapeHtml(currentSection.title)}</h3>
                        <p>${escapeHtml(currentSection.content)}</p>
                        <ul class="source-list">${renderSourceRefs(currentSection.sourceRefs)}</ul>
                      </div>
                    ` : ''}
                  </div>
                ` : `
                  <div class="theory-reader-card">
                    <h3>Offizielle Quellenbelege (${selectedModule.title})</h3>
                    <ul class="source-list">${renderSourceRefs(selectedModule.sourceRefs)}</ul>
                  </div>
                `}
              </div>
            `}
          </section>
        </main>
      `}

      ${toastNotice ? `
        <div class="toast-notice" role="status">
          <span>⚡</span>
          <span>${escapeHtml(toastNotice)}</span>
        </div>
      ` : ''}
      ${validationErrors.length > 0 ? `<div style="display:none;" class="validation-warning">${escapeHtml(validationErrors.join(', '))}</div>` : ''}
    </div>
  `;

  // Attach Event Listeners
  document.querySelectorAll('[data-sidebar-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-sidebar-tab') as 'modules' | 'agenda';
      if (tab) {
        activeSidebarTab = tab;
        sound.playClick();
        render();
      }
    });
  });

  document.querySelectorAll('[data-stage-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-stage-tab') as 'quiz' | 'theory' | 'sources';
      if (tab) {
        activeStageTab = tab;
        sound.playClick();
        render();
      }
    });
  });

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
      sound.playClick();
      render();
    });
  });

  document.querySelectorAll('[data-section-id]').forEach((button) => {
    button.addEventListener('click', () => {
      const sectionId = button.getAttribute('data-section-id');
      if (!sectionId) return;
      state.studySectionId = sectionId;
      saveCurrentState();
      sound.playClick();
      render();
    });
  });

  document.querySelectorAll('[data-answer-index]').forEach((button) => {
    button.addEventListener('click', (e) => {
      const questionId = button.getAttribute('data-question-id');
      const answerIndex = Number(button.getAttribute('data-answer-index'));
      if (!questionId || Number.isNaN(answerIndex)) return;

      const currentQuiz = getCurrentQuiz();
      const currentQuestion = getQuestionById(currentQuiz.questions, questionId);
      if (!currentQuestion) return;

      const selectedModule = getSelectedModule();
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
        streak = 0;
        sound.playWrong();
      } else {
        streak++;
        const gain = 50 * streak;
        xp += gain;
        localStorage.setItem('ihk-xp', String(xp));
        sound.playSuccess(streak);

        const mouseEvent = e as MouseEvent;
        const originX = mouseEvent.clientX || window.innerWidth / 2;
        const originY = mouseEvent.clientY || window.innerHeight / 2;
        confetti.burst(originX, originY, 35);
        triggerRewardPill(`+${gain} XP! ${streak > 1 ? `🔥 ${streak}x STREAK` : '🎯'}`, originX, originY);
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
      activeStageTab = 'quiz';
      activeView = 'dashboard';
      saveCurrentState();
      sound.playClick();
      render();
    });
  });

  document.querySelectorAll('[data-review-retry]').forEach((button) => {
    button.addEventListener('click', () => {
      const retryQuestionId = button.getAttribute('data-review-retry');
      if (!retryQuestionId || !getCurrentReviewQueue().includes(retryQuestionId)) return;
      state.currentQuestionId = retryQuestionId;
      state.retryQuestionId = retryQuestionId;
      activeStageTab = 'quiz';
      activeView = 'dashboard';
      saveCurrentState();
      sound.playClick();
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

      sound.playClick();
      const updatedSession = answerExamQuestion(session, questionId, answerIndex, Date.now());
      state.examSession = updatedSession;
      saveCurrentState();

      if (updatedSession.status === 'completed') {
        const quiz = getQuizByModuleId(session.moduleId);
        const result = quiz ? getExamResult(updatedSession, quiz.questions) : null;
        if (result && result.percent >= 60) {
          sound.playFanfare();
          confetti.burst(window.innerWidth / 2, window.innerHeight * 0.4, 70);
          showToast(`Prüfung mit ${result.percent}% bestanden! 🏆`);
        }
      }
      render();
    });
  });

  document.querySelectorAll('[data-action]').forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.getAttribute('data-action');
      if (!action) return;

      const reviewQueue = getCurrentReviewQueue();

      if (action === 'open-settings') {
        activeView = 'settings';
        sound.playClick();
        render();
        return;
      }

      if (action === 'close-settings') {
        activeView = 'dashboard';
        sound.playClick();
        render();
        return;
      }

      if (action === 'reset-state') {
        if (window.confirm('Möchtest du wirklich deinen gesamten lokalen Lernstand und XP zurücksetzen?')) {
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem('ihk-xp');
          Object.assign(state, defaultState);
          saveCurrentState();
          xp = 0;
          streak = 0;
          sound.playWrong();
          showToast('Lernstand vollständig zurückgesetzt 🔄');
          render();
        }
        return;
      }

      if (action === 'toggle-sound') {
        sound.toggleMute();
        render();
        return;
      }

      if (action === 'next-question') {
        const currentQuiz = getCurrentQuiz();
        const currentIdx = currentQuiz.questions.findIndex((q) => q.id === state.currentQuestionId);
        if (currentIdx >= 0 && currentIdx < currentQuiz.questions.length - 1) {
          state.currentQuestionId = currentQuiz.questions[currentIdx + 1]?.id ?? null;
          state.retryQuestionId = null;
          saveCurrentState();
          sound.playClick();
          render();
        }
        return;
      }

      if (action === 'review-next' && reviewQueue.length > 0) {
        state.currentQuestionId = reviewQueue[0] ?? currentQuiz.questions[0]?.id ?? null;
        activeStageTab = 'quiz';
        activeView = 'dashboard';
        saveCurrentState();
        sound.playClick();
        showToast('Wiederholungsfrage geladen 🔄');
        render();
        return;
      }

      if (action === 'export-state') {
        downloadCurrentState();
        return;
      }

      if (action === 'import-state') {
        app.querySelector<HTMLInputElement>('[data-state-import-input]')?.click();
        return;
      }

      if (action === 'exam-mode') {
        const examDeck = buildExamDeck(currentQuiz.questions, reviewQueue, EXAM_QUESTION_LIMIT);
        state.examSession = startExamSession(selectedModule.moduleId, examDeck, Date.now(), EXAM_DURATION_SECONDS);
        activeView = 'dashboard';
        saveCurrentState();
        sound.playClick();
        render();
        return;
      }

      if (action === 'close-exam') {
        state.examSession = null;
        saveCurrentState();
        sound.playClick();
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
        state.currentQuestionId = currentQuiz.questions[1]?.id ?? currentQuiz.questions[0]?.id ?? null;
        activeStageTab = 'quiz';
        activeView = 'dashboard';
        showToast('Schnelltest aktiv 🚀');
      }

      saveCurrentState();
      sound.playClick();
      render();
    });
  });

  app.querySelector<HTMLInputElement>('[data-state-import-input]')?.addEventListener('change', (event) => {
    const input = event.currentTarget;
    if (!(input instanceof HTMLInputElement)) return;

    const file = input.files?.[0];
    input.value = '';
    if (file) void restoreStateFromFile(file);
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
        sound.playWrong();
        showToast('Die Prüfungszeit ist abgelaufen! ⏱️');
        render();
      }
    }, 1_000);
  }
}

render();
