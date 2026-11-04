import * as THREE from 'three';

export interface MindARControllerConfig {
  container: HTMLDivElement;
  onTargetFound?: () => void;
  onTargetLost?: () => void;
}

export class MindARSimulationController {
  private container: HTMLDivElement;
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private anchorGroup: THREE.Group | null = null;
  private isTrackingActive: boolean = false;
  private isUsingFallback: boolean = false;
  private animationFrameId: number | null = null;
  private onTargetFound?: () => void;
  private onTargetLost?: () => void;

  constructor(config: MindARControllerConfig) {
    this.container = config.container;
    this.onTargetFound = config.onTargetFound;
    this.onTargetLost = config.onTargetLost;
  }

  public async init(): Promise<void> {
    const width = this.container.clientWidth || 800;
    const height = this.container.clientHeight || 600;

    // Three.js Scene Setup
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.01, 1000);
    this.camera.position.set(0, 0, 5);

    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Append canvas
    this.container.innerHTML = '';
    this.container.appendChild(this.renderer.domElement);

    // Anchor group for AR overlays
    this.anchorGroup = new THREE.Group();
    this.scene.add(this.anchorGroup);

    // Lighting matching notebook environment
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x00f0ff, 1.8);
    dirLight.position.set(2, 5, 4);
    this.scene.add(dirLight);

    // Initialize MindAR tracking or graceful fallback
    const mindarGlobal = (window as unknown as { MINDAR?: { IMAGE?: { MindARThree: unknown } } }).MINDAR;
    if (mindarGlobal?.IMAGE?.MindARThree) {
      this.isUsingFallback = false;
    } else {
      // Planar viewport projection fallback
      this.isUsingFallback = true;
    }

    this.isTrackingActive = true;
    this.onTargetFound?.();
  }

  public getAnchorGroup(): THREE.Group | null {
    return this.anchorGroup;
  }

  public getScene(): THREE.Scene | null {
    return this.scene;
  }

  public getCamera(): THREE.PerspectiveCamera | null {
    return this.camera;
  }

  public isTracking(): boolean {
    return this.isTrackingActive;
  }

  public isFallbackMode(): boolean {
    return this.isUsingFallback;
  }

  public handleResize(width: number, height: number): void {
    if (this.camera && this.renderer) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    }
  }

  public render(): void {
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  public dispose(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement.parentElement) {
        this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
      }
    }
    this.scene = null;
    this.camera = null;
    this.anchorGroup = null;
    this.isTrackingActive = false;
    this.onTargetLost?.();
  }
}

