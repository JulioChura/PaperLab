/**
 * Carga perezosa de MindAR (image tracking) desde el CDN, versión fijada.
 *
 * Usamos la API de bajo nivel (Controller + Compiler) en lugar de MindARThree porque:
 *  - Reutiliza el <video> que YA está corriendo (la cámara nunca se reinicia).
 *  - El objetivo de seguimiento se compila al vuelo a partir de la foto capturada,
 *    así cualquier hoja de cuaderno se convierte en un marcador AR.
 */
const MINDAR_URL = 'https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image.prod.js';

export interface MindARUpdate {
  type: 'updateMatrix' | 'processDone' | string;
  targetIndex?: number;
  worldMatrix?: number[] | null;
}

export interface MindARController {
  inputWidth: number;
  inputHeight: number;
  addImageTargetsFromBuffer(buffer: ArrayBuffer): { dimensions: [number, number][] };
  dummyRun(input: HTMLVideoElement): Promise<void>;
  getProjectionMatrix(): number[];
  processVideo(input: HTMLVideoElement): void;
  stopProcessVideo(): void;
  dispose?(): void;
}

interface MindARCompiler {
  compileImageTargets(images: CanvasImageSource[], onProgress: (percent: number) => void): Promise<unknown>;
  exportData(): Uint8Array;
}

interface MindARModule {
  Controller: new (options: {
    inputWidth: number;
    inputHeight: number;
    maxTrack?: number;
    filterMinCF?: number;
    filterBeta?: number;
    warmupTolerance?: number;
    missTolerance?: number;
    onUpdate: (data: MindARUpdate) => void;
  }) => MindARController;
  Compiler: new () => MindARCompiler;
}

let modulePromise: Promise<MindARModule> | null = null;

export function loadMindAR(): Promise<MindARModule> {
  if (!modulePromise) {
    modulePromise = import(/* @vite-ignore */ MINDAR_URL).then((mod) => mod as MindARModule);
    modulePromise.catch(() => {
      modulePromise = null; // permite reintentar si falló la red
    });
  }
  return modulePromise;
}

/** Compila la imagen capturada como objetivo de seguimiento (.mind en memoria). */
export async function compileTargetFromCanvas(
  source: HTMLCanvasElement,
  onProgress?: (percent: number) => void,
): Promise<ArrayBuffer> {
  const { Compiler } = await loadMindAR();
  const compiler = new Compiler();
  const t0 = performance.now();
  await compiler.compileImageTargets([source], (p) => onProgress?.(Math.min(100, Math.max(0, p))));
  console.info(`[PaperLab AR] Objetivo compilado en ${((performance.now() - t0) / 1000).toFixed(1)} s (${source.width}x${source.height}).`);
  const data = compiler.exportData();
  return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
}
