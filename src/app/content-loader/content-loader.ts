import type { Module, ModuleSummary, QuizSet } from '../../types';
import ap1IndexData from '../../../content/ap1/index.json';
import moduleOneData from '../../../content/ap1/01-datenmodellierung/module.json';
import moduleTwoData from '../../../content/ap1/02-sql/module.json';
import moduleThreeData from '../../../content/ap1/03-pruefungsrahmen/module.json';
import quizOneData from '../../../content/ap1/01-datenmodellierung/quiz.json';
import quizTwoData from '../../../content/ap1/02-sql/quiz.json';
import quizThreeData from '../../../content/ap1/03-pruefungsrahmen/quiz.json';
import sourceCatalogData from '../../../sources/catalog.json';

const moduleCatalog: Module[] = [moduleOneData as Module, moduleTwoData as Module, moduleThreeData as Module];
const quizCatalog: Record<string, QuizSet> = {
  'ap1-01-datenmodellierung': quizOneData as QuizSet,
  'ap1-02-sql': quizTwoData as QuizSet,
  'ap1-03-pruefungsrahmen': quizThreeData as QuizSet,
};

export function getModuleCatalog(): Module[] {
  return moduleCatalog;
}

export function getModuleById(moduleId: string): Module | undefined {
  return moduleCatalog.find((module) => module.moduleId === moduleId);
}

export function getModuleSummaryList(): ModuleSummary[] {
  return moduleCatalog.map((module) => ({
    moduleId: module.moduleId,
    title: module.title,
    exam: module.exam,
    difficulty: module.difficulty,
    estimatedMinutes: 20,
    sourceRefs: module.sourceRefs,
  }));
}

export function getQuizByModuleId(moduleId: string): QuizSet | undefined {
  return quizCatalog[moduleId];
}

export function getApprovedSourceUrl(sourceId: string): string | null {
  const source = sourceCatalogData.sources.find((entry) => entry.sourceId === sourceId && entry.status === 'approved');
  return source?.url ?? null;
}

export function getModuleIndex(): Array<{ moduleId: string; title: string; difficulty: string; estimatedMinutes: number; sourceRefs: Array<{ sourceId: string; quote: string; section: string; type?: string }> }> {
  return (ap1IndexData as { modules: Array<{ moduleId: string; title: string; difficulty: string; estimatedMinutes: number; sourceRefs: Array<{ sourceId: string; quote: string; section: string; type?: string }> }> }).modules;
}
