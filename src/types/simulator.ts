import type { ExerciseDefinition } from '../data/exercises';

export type SimulationMode = 'continuous' | 'discrete_step';

export interface ExtractedPaperStyle {
  paperColor: string;
  graphiteColor: string;
  strokeIntensity: number; // 0 to 1
  contrastRatio: number;
  highlightColor: string;
}

export interface ContinuousSimulationState {
  time: number;
  deltaTime: number;
  timeScale: number;
  isPlaying: boolean;
  fps: number;
  telemetry: Record<string, number | string>;
}

export interface StepByStepSimulationState {
  currentStep: number;
  totalSteps: number;
  isAutoStepping: boolean;
  autoStepIntervalMs: number;
  activeLabel: string;
  stepDescription: string;
  memoryStack: Record<string, unknown>;
  history: number[];
}

export interface SimulatorSession {
  exercise: ExerciseDefinition;
  mode: SimulationMode;
  paperStyle: ExtractedPaperStyle;
  continuousState: ContinuousSimulationState;
  stepState: StepByStepSimulationState;
}

