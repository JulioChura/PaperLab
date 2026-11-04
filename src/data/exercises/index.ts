// 19 Individual Exercise Definitions for PaperLab
import physicsInclinedPlane from './physics_inclined_plane.json';
import physicsPendulum from './physics_pendulum.json';
import physicsProjectile from './physics_projectile.json';
import physicsSpringHooke from './physics_spring_hooke.json';
import physicsMruMruv from './physics_mru_mruv.json';
import physicsAtwoodPulley from './physics_atwood_pulley.json';

import circuitsSimpleLoop from './circuits_simple_loop.json';
import circuitsSeries from './circuits_series.json';
import circuitsParallel from './circuits_parallel.json';
import circuitsSwitch from './circuits_switch.json';
import circuitsRc from './circuits_rc.json';
import circuitsLogicGates from './circuits_logic_gates.json';

import flowchartLogicBlocks from './flowchart_logic_blocks.json';
import codeStepDebugger from './code_step_debugger.json';

import mathSolidGeometry3d from './math_solid_geometry_3d.json';
import mathAnalyticGeometry from './math_analytic_geometry.json';
import mathFunctionGraph from './math_function_graph.json';
import mathEquationSolver from './math_equation_solver.json';
import mathGeometricAngles from './math_geometric_angles.json';

export interface ExerciseDefinition {
  id: string;
  name: string;
  topicId: string;
  topicName: string;
  description: string;
  visual_syntax: {
    primary_shapes: string[];
    secondary_markings: string[];
    bounding_box_cues: Record<string, string>;
  };
  extracted_parameters: Record<string, unknown>;
  physics_model?: Record<string, unknown>;
  math_model?: Record<string, unknown>;
  computational_model?: Record<string, unknown>;
  simulation_render: Record<string, unknown>;
}

export const ALL_EXERCISES: ExerciseDefinition[] = [
  // Módulo 1: Física (6)
  physicsInclinedPlane,
  physicsPendulum,
  physicsProjectile,
  physicsSpringHooke,
  physicsMruMruv,
  physicsAtwoodPulley,

  // Módulo 2: Circuitos (6)
  circuitsSimpleLoop,
  circuitsSeries,
  circuitsParallel,
  circuitsSwitch,
  circuitsRc,
  circuitsLogicGates,

  // Módulo 3: Algoritmos / Flowcharts (2)
  flowchartLogicBlocks,
  codeStepDebugger,

  // Módulo 4: Matemáticas (5)
  mathSolidGeometry3d,
  mathAnalyticGeometry,
  mathFunctionGraph,
  mathEquationSolver,
  mathGeometricAngles
];

export const getExercisesByModule = (moduleId: string): ExerciseDefinition[] => {
  const normalized = moduleId.toLowerCase().trim();
  if (normalized === 'physics' || normalized === 'fisica') {
    return ALL_EXERCISES.filter((ex) => ex.topicId === 'physics');
  }
  if (normalized === 'circuits' || normalized === 'circuitos') {
    return ALL_EXERCISES.filter((ex) => ex.topicId === 'circuits');
  }
  if (normalized === 'flowcharts' || normalized === 'algorithms' || normalized === 'algoritmos') {
    return ALL_EXERCISES.filter((ex) => ex.topicId === 'algorithms' || ex.topicId === 'flowcharts');
  }
  if (normalized === 'math' || normalized === 'matematicas') {
    return ALL_EXERCISES.filter((ex) => ex.topicId === 'math');
  }
  return ALL_EXERCISES;
};

export const getExerciseById = (id: string): ExerciseDefinition | undefined => {
  return ALL_EXERCISES.find((ex) => ex.id === id);
};

