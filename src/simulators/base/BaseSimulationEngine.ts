import * as THREE from 'three';
import type { ExtractedPaperStyle, SimulationMode } from '../../types/simulator';

export abstract class BaseSimulationEngine {
  public abstract readonly id: string;
  public abstract readonly name: string;
  public abstract readonly mode: SimulationMode;

  protected scene: THREE.Scene | null = null;
  protected anchorGroup: THREE.Group | null = null;
  protected camera: THREE.Camera | null = null;
  protected paperStyle: ExtractedPaperStyle;
  protected isInitialized: boolean = false;

  constructor(initialPaperStyle: ExtractedPaperStyle) {
    this.paperStyle = initialPaperStyle;
  }

  public init(
    scene: THREE.Scene,
    anchorGroup: THREE.Group,
    camera: THREE.Camera,
    paperStyle: ExtractedPaperStyle
  ): void {
    this.scene = scene;
    this.anchorGroup = anchorGroup;
    this.camera = camera;
    this.paperStyle = paperStyle;
    this.isInitialized = true;
    this.setupScene();
  }

  public setPaperStyle(style: ExtractedPaperStyle): void {
    this.paperStyle = style;
    this.onPaperStyleUpdated();
  }

  /**
   * Creates a pencil/graphite styled material borrowing the sampled physical paper texture.
   */
  protected createGraphiteMaterial(opacity: number = 0.9): THREE.MeshStandardMaterial {
    const color = new THREE.Color(this.paperStyle.graphiteColor);
    return new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.85,
      metalness: 0.1,
      transparent: opacity < 1,
      opacity: opacity
    });
  }

  /**
   * Creates a luminous neon AR highlight material (cyan, amber, emerald).
   */
  protected createHolographicMaterial(hexColor: string, opacity: number = 0.95): THREE.MeshBasicMaterial {
    return new THREE.MeshBasicMaterial({
      color: new THREE.Color(hexColor),
      transparent: true,
      opacity: opacity,
      wireframe: false
    });
  }

  protected abstract setupScene(): void;
  public abstract update(dt: number, totalTime: number, currentStep: number): void;
  public abstract dispose(): void;
  protected onPaperStyleUpdated(): void {
    // Optional hook for subclasses
  }
}

