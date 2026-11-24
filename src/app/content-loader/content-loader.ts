import type { Module, ModuleSummary, QuizSet } from '../../types';
import ap1IndexData from '../../../content/ap1/index.json';
import moduleOneData from '../../../content/ap1/01-datenmodellierung/module.json';
import moduleTwoData from '../../../content/ap1/02-sql/module.json';
import moduleThreeData from '../../../content/ap1/03-pruefungsrahmen/module.json';
import moduleFourData from '../../../content/ap1/04-projektmanagement/module.json';
import moduleFiveData from '../../../content/ap1/05-change-und-arbeitsplatz/module.json';
import moduleSixData from '../../../content/ap1/06-it-sicherheit/module.json';
import moduleSevenData from '../../../content/ap1/07-wirtschaftlichkeit/module.json';
import quizOneData from '../../../content/ap1/01-datenmodellierung/quiz.json';
import quizTwoData from '../../../content/ap1/02-sql/quiz.json';
import quizThreeData from '../../../content/ap1/03-pruefungsrahmen/quiz.json';
import quizFourData from '../../../content/ap1/04-projektmanagement/quiz.json';
import quizFiveData from '../../../content/ap1/05-change-und-arbeitsplatz/quiz.json';
import quizSixData from '../../../content/ap1/06-it-sicherheit/quiz.json';
import quizSevenData from '../../../content/ap1/07-wirtschaftlichkeit/quiz.json';
import sourceCatalogData from '../../../sources/catalog.json';

const moduleCatalog: Module[] = [
  moduleOneData as Module,
  moduleTwoData as Module,
  moduleThreeData as Module,
  moduleFourData as Module,
  moduleFiveData as Module,
  moduleSixData as Module,
  moduleSevenData as Module,
];
const quizCatalog: Record<string, QuizSet> = {
  'ap1-01-datenmodellierung': quizOneData as QuizSet,
  'ap1-02-sql': quizTwoData as QuizSet,
  'ap1-03-pruefungsrahmen': quizThreeData as QuizSet,
  'ap1-04-projektmanagement': quizFourData as QuizSet,
  'ap1-05-change-und-arbeitsplatz': quizFiveData as QuizSet,
  'ap1-06-it-sicherheit': quizSixData as QuizSet,
  'ap1-07-wirtschaftlichkeit': quizSevenData as QuizSet,
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

export function getModuleIndex(): Array<{ moduleId: string; title: string; difficulty: string; estimatedMinutes: number; examRelevance?: string; sourceRefs: Array<{ sourceId: string; quote: string; section: string; type?: string }> }> {
  return (ap1IndexData as { modules: Array<{ moduleId: string; title: string; difficulty: string; estimatedMinutes: number; examRelevance?: string; sourceRefs: Array<{ sourceId: string; quote: string; section: string; type?: string }> }> }).modules;
}
