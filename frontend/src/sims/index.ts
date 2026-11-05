/**
 * Punto único: resultado validado del backend → plan de solución/simulación para la hoja.
 * Cubre los 23 tipos de ejercicio de los 4 módulos.
 */
import { planFromEquation, planFromFunction, type SolutionPlan } from '../ar/mathEngine';
import { physicsPlan } from './physics';
import { circuitPlan } from './circuits';
import { flowPlan } from './flow';
import { mathFigurePlan } from './mathSims';

export function buildSimulationPlan(exerciseType: string, data: Record<string, unknown>): SolutionPlan | null {
  try {
    switch (exerciseType) {
      case 'equation_solver':
        return planFromEquation(data);
      case 'function_graph':
        return planFromFunction(data);
      case 'geometry_3d':
      case 'analytic_geometry':
      case 'geometric_angles':
        return mathFigurePlan(exerciseType, data);
      case 'inclined_plane':
      case 'simple_pendulum':
      case 'projectile_motion':
      case 'mass_spring':
      case 'rectilinear_motion':
      case 'atwood_machine':
        return physicsPlan(exerciseType, data);
      case 'single_loop':
      case 'series_resistors':
      case 'parallel_resistors':
      case 'interactive_switch':
      case 'rc_circuit':
      case 'logic_gates':
        return circuitPlan(exerciseType, data);
      case 'sequential_flowchart':
      case 'conditional_flowchart':
      case 'loop_flowchart':
      case 'code_debugger':
      case 'trace_table':
      case 'recursive_flowchart':
        return flowPlan(exerciseType, data);
    }
  } catch (err) {
    console.warn('[PaperLab AR] No se pudo construir la simulación:', exerciseType, err);
  }
  return null;
}
