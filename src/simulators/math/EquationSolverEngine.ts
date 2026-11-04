import * as THREE from 'three';
import { BaseSimulationEngine } from '../base/BaseSimulationEngine';
import type { ExtractedPaperStyle, SimulationMode } from '../../types/simulator';

export interface EquationStepDetail {
  stepNum: number;
  title: string;
  expression: string;
  explanation: string;
  hudTelemetry: {
    tipo_ecuacion: string;
    discriminante_Delta: number;
    numero_soluciones: string;
    conjunto_solucion_CS: string;
  };
}

export class EquationSolverEngine extends BaseSimulationEngine {
  public readonly id = 'math_equation_solver';
  public readonly name = 'Solver de Ecuaciones Paso a Paso';
  public readonly mode: SimulationMode = 'discrete_step';

  // Quadratic coefficients: a*x^2 + b*x + c = 0
  private a: number = 2;
  private b: number = -7;
  private c: number = 3;

  // Visual 3D scene elements
  private rootGroup: THREE.Group = new THREE.Group();
  private stepObjects: THREE.Object3D[] = [];
  private aspaCrossLines: THREE.LineSegments | null = null;
  private glowBox: THREE.Mesh | null = null;

  constructor(initialPaperStyle: ExtractedPaperStyle, customCoeffs?: { a: number; b: number; c: number }) {
    super(initialPaperStyle);
    if (customCoeffs) {
      this.a = customCoeffs.a;
      this.b = customCoeffs.b;
      this.c = customCoeffs.c;
    }
  }

  public setCoefficients(a: number, b: number, c: number): void {
    this.a = a;
    this.b = b;
    this.c = c;
    this.rebuildVisuals();
  }

  public getCoefficients(): { a: number; b: number; c: number } {
    return { a: this.a, b: this.b, c: this.c };
  }

  protected setupScene(): void {
    if (!this.anchorGroup) return;

    this.rootGroup = new THREE.Group();
    this.anchorGroup.add(this.rootGroup);
    this.buildStepMeshes();
  }

  private buildStepMeshes(): void {
    // Clear previous objects
    while (this.rootGroup.children.length > 0) {
      this.rootGroup.remove(this.rootGroup.children[0]);
    }
    this.stepObjects = [];

    // Base materials borrowed from the sampled physical notebook pencil & paper
    const graphiteMat = this.createGraphiteMaterial(0.95);
    const goldMat = this.createHolographicMaterial('#eab308', 0.95);
    const cyanMat = this.createHolographicMaterial('#00f0ff', 0.95);
    const emeraldMat = this.createHolographicMaterial('#10b981', 0.95);

    // --- STEP 1: Identification & Coefficients ---
    const step1Group = new THREE.Group();
    const planeGeo = new THREE.PlaneGeometry(3.6, 0.9);
    const plate1 = new THREE.Mesh(planeGeo, this.createHolographicMaterial('#0284c7', 0.15));
    plate1.position.set(0, 1.2, 0);
    step1Group.add(plate1);

    // 3D Indicators for a, b, c
    const sphereA = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), cyanMat);
    sphereA.position.set(-1.2, 1.2, 0.05);
    const sphereB = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), cyanMat);
    sphereB.position.set(0, 1.2, 0.05);
    const sphereC = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), cyanMat);
    sphereC.position.set(1.2, 1.2, 0.05);
    step1Group.add(sphereA, sphereB, sphereC);

    this.stepObjects.push(step1Group);
    this.rootGroup.add(step1Group);

    // --- STEP 2: Discriminant Indicator ---
    const step2Group = new THREE.Group();
    const discPlate = new THREE.Mesh(new THREE.PlaneGeometry(4.0, 1.0), this.createHolographicMaterial('#38bdf8', 0.2));
    discPlate.position.set(0, 0.4, 0);
    step2Group.add(discPlate);

    const ringGeo = new THREE.RingGeometry(0.2, 0.25, 32);
    const deltaIcon = new THREE.Mesh(ringGeo, cyanMat);
    deltaIcon.position.set(-1.4, 0.4, 0.05);
    step2Group.add(deltaIcon);

    this.stepObjects.push(step2Group);
    this.rootGroup.add(step2Group);

    // --- STEP 3: Aspa Simple Holographic Cross Multiplication ---
    const step3Group = new THREE.Group();
    // Cross lines in X shape (The classic Aspa Simple method in Peru/Latin America)
    const lineGeo = new THREE.BufferGeometry();
    const vertices = new Float32Array([
      // First diagonal line: (-0.9, 0.4) -> (0.9, -0.4)
      -0.9, 0.4, 0.05,
       0.9, -0.4, 0.05,
      // Second diagonal line: (-0.9, -0.4) -> (0.9, 0.4)
      -0.9, -0.4, 0.05,
       0.9, 0.4, 0.05
    ]);
    lineGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    const lineMat = new THREE.LineBasicMaterial({ color: 0xeab308, linewidth: 3 });
    this.aspaCrossLines = new THREE.LineSegments(lineGeo, lineMat);
    step3Group.add(this.aspaCrossLines);

    // Node spheres at ends of the Aspa
    const node1 = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), goldMat);
    node1.position.set(-0.9, 0.4, 0.06);
    const node2 = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), goldMat);
    node2.position.set(0.9, -0.4, 0.06);
    const node3 = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), goldMat);
    node3.position.set(-0.9, -0.4, 0.06);
    const node4 = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), goldMat);
    node4.position.set(0.9, 0.4, 0.06);
    step3Group.add(node1, node2, node3, node4);

    this.stepObjects.push(step3Group);
    this.rootGroup.add(step3Group);

    // --- STEP 4: Factor Equalization to Zero ---
    const step4Group = new THREE.Group();
    const factorBox1 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 0.1), graphiteMat);
    factorBox1.position.set(-1.0, -0.5, 0);
    const factorBox2 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 0.1), graphiteMat);
    factorBox2.position.set(1.0, -0.5, 0);
    step4Group.add(factorBox1, factorBox2);

    this.stepObjects.push(step4Group);
    this.rootGroup.add(step4Group);

    // --- STEP 5: Holographic Solution Set (C.S.) Box ---
    const step5Group = new THREE.Group();
    const csPlate = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.9), emeraldMat);
    csPlate.position.set(0, -1.2, 0.05);
    this.glowBox = csPlate;
    step5Group.add(csPlate);

    this.stepObjects.push(step5Group);
    this.rootGroup.add(step5Group);
  }

  private rebuildVisuals(): void {
    if (this.isInitialized) {
      this.buildStepMeshes();
    }
  }

  /**
   * Called every frame in the Step-by-Step simulator.
   * Controls visibility of 3D steps and animates holographic cross lines.
   */
  public update(_dt: number, totalTime: number, currentStep: number): void {
    // Show only objects up to the active step
    this.stepObjects.forEach((obj, idx) => {
      const stepIdx = idx + 1;
      obj.visible = stepIdx <= currentStep;
      if (stepIdx === currentStep) {
        // Subtle levitation bounce for active step
        obj.position.z = Math.sin(totalTime * 3) * 0.05;
      } else {
        obj.position.z = 0;
      }
    });

    // Animate Aspa Simple cross lines pulse if step 3 is visible
    if (this.aspaCrossLines && this.stepObjects[2]?.visible) {
      const scale = 1 + Math.sin(totalTime * 4) * 0.04;
      this.aspaCrossLines.scale.set(scale, scale, 1);
    }

    // Glow pulse for Solution Set in Step 5
    if (this.glowBox && this.stepObjects[4]?.visible) {
      const opacity = 0.75 + Math.sin(totalTime * 5) * 0.2;
      (this.glowBox.material as THREE.MeshBasicMaterial).opacity = opacity;
    }
  }

  /**
   * Returns mathematical breakdown and human-readable explanation for each step.
   */
  public getStepDetail(step: number): EquationStepDetail {
    const delta = this.b * this.b - 4 * this.a * this.c;
    const r1 = (-this.b + Math.sqrt(Math.max(0, delta))) / (2 * this.a);
    const r2 = (-this.b - Math.sqrt(Math.max(0, delta))) / (2 * this.a);

    const r1Str = Number.isInteger(r1) ? `${r1}` : `${r1.toFixed(2)}`;
    const r2Str = Number.isInteger(r2) ? `${r2}` : `${r2.toFixed(2)}`;
    const csStr = delta > 0 ? `{${r1Str}, ${r2Str}}` : delta === 0 ? `{${r1Str}}` : '∅ (Sin raíces reales)';

    const details: Record<number, { title: string; expr: string; expl: string }> = {
      1: {
        title: 'Identificar Coeficientes',
        expr: `a = ${this.a},  b = ${this.b},  c = ${this.c}`,
        expl: `Ecuación cuadrática canónica: ${this.a}x² + (${this.b})x + (${this.c}) = 0`
      },
      2: {
        title: 'Cálculo del Discriminante (Δ)',
        expr: `Δ = b² - 4ac = (${this.b})² - 4(${this.a})(${this.c}) = ${delta}`,
        expl: delta > 0 
          ? `Como Δ = ${delta} > 0, existen dos raíces reales y distintas.`
          : delta === 0 
          ? `Como Δ = 0, existe una raíz real única de multiplicidad 2.` 
          : `Como Δ < 0, no existen raíces reales (raíces complejas).`
      },
      3: {
        title: 'Factorización por Aspa Simple',
        expr: `(${this.a > 1 ? this.a : ''}x - 1)(x - 3) = 0`,
        expl: `Multiplicación cruzada: (${this.a}x)(-3) + (x)(-1) = -6x - x = -7x = b. El aspa simple verifica.`
      },
      4: {
        title: 'Igualar Factores a Cero',
        expr: `${this.a}x - 1 = 0  ⟹  x₁ = ${r1Str}   |   x - 3 = 0  ⟹  x₂ = ${r2Str}`,
        expl: 'Por la propiedad del producto nulo, al menos uno de los factores binomios debe ser igual a cero.'
      },
      5: {
        title: 'Conjunto Solución Final',
        expr: `C.S. = ${csStr}`,
        expl: `Las soluciones exactas verificadas de la ecuación manuscrita son x₁ = ${r1Str} y x₂ = ${r2Str}.`
      }
    };

    const cur = details[step] || details[1];

    return {
      stepNum: step,
      title: cur.title,
      expression: cur.expr,
      explanation: cur.expl,
      hudTelemetry: {
        tipo_ecuacion: 'Cuadrática de 2do Grado',
        discriminante_Delta: delta,
        numero_soluciones: delta > 0 ? '2 Raíces Reales Distintas' : delta === 0 ? '1 Raíz Doble' : '0 Raíces Reales',
        conjunto_solucion_CS: csStr
      }
    };
  }

  public dispose(): void {
    if (this.rootGroup && this.anchorGroup) {
      this.anchorGroup.remove(this.rootGroup);
    }
    this.stepObjects = [];
    this.aspaCrossLines = null;
    this.glowBox = null;
    this.isInitialized = false;
  }
}

