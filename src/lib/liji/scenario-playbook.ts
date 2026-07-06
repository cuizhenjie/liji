import type { ScenarioAcceptanceItem } from "./scenario-acceptance";

export type ScenarioPlaybookStepStatus = "done" | "current" | "upcoming";

export type ScenarioPlaybookStep = {
  id: string;
  label: string;
  detail: string;
  status: ScenarioPlaybookStepStatus;
  critical: boolean;
};

export type ScenarioPlaybook = {
  id: ScenarioAcceptanceItem["id"];
  label: string;
  status: ScenarioAcceptanceItem["status"];
  progress: number;
  currentStep: string;
  nextStep: string;
  section: ScenarioAcceptanceItem["section"];
  cta: string;
  steps: ScenarioPlaybookStep[];
};

function playbookSteps(scenario: ScenarioAcceptanceItem): ScenarioPlaybookStep[] {
  const firstMissingIndex = scenario.checks.findIndex((check) => !check.passed);

  return scenario.checks.map((check, index) => ({
    id: check.id,
    label: check.label,
    detail: check.detail,
    critical: Boolean(check.critical),
    status: check.passed
      ? "done"
      : firstMissingIndex === index
        ? "current"
        : "upcoming",
  }));
}

export function buildScenarioPlaybooks(scenarios: ScenarioAcceptanceItem[]): ScenarioPlaybook[] {
  return scenarios.map((scenario) => ({
    id: scenario.id,
    label: scenario.label,
    status: scenario.status,
    progress: scenario.progress,
    currentStep: scenario.currentStep,
    nextStep: scenario.nextStep,
    section: scenario.section,
    cta: scenario.cta,
    steps: playbookSteps(scenario),
  }));
}
