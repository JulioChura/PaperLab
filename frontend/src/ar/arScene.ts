/**
 * Escena AR sobre el papel (Three.js).
 *
 * - Render planar por HOMOGRAFÍA en espacio de pantalla: el contenido vive en px del fotograma
 *   capturado y una matriz proyectiva 4x4 lo lleva a la posición actual de la hoja en pantalla.
 *   La GPU interpola las texturas con corrección de perspectiva, así los trazos quedan "pegados"
 *   al papel incluso inclinando el celular.
 * - El canvas WebGL se compone con `mix-blend-mode: multiply` sobre el <video>: el fondo es blanco
 *   (neutro) y cada trazo multiplica el papel en vivo, así la tinta virtual hereda la iluminación,
 *   las sombras y la textura reales de la hoja.
 */
import * as THREE from 'three';
import type { HybridPaperTracker } from './paperTracker';

export type TrackingStatus = 'static' | 'tracking' | 'lost';

export interface InkUniforms {
  inkReflectance: [number, number, number];
  inkGrain: number;
  highlightColor: string;
  pencilColor: string;
}

/** Colocación en unidades del ancla (ver arLayout): 1 = ancho del fotograma, origen al centro, y hacia arriba. */
export interface LayerPlacement {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface MediaSource {
  element: HTMLVideoElement | HTMLImageElement;
  fit: 'cover' | 'contain';
  width: number;
  height: number;
}

interface SceneLayer {
  mesh: THREE.Mesh;
  material: THREE.ShaderMaterial;
  duration: number;
  progress: number;
}

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAG = /* glsl */ `
uniform sampler2D map;
uniform sampler2D grain;
uniform vec2 grainScale;
uniform float progress;
uniform float opacity;
uniform float inkGrain;
uniform vec3 inkReflectance;
uniform vec3 highlightColor;
uniform vec3 pencilColor;
varying vec2 vUv;

void main() {
  const float soft = 0.06;
  float p = progress * (1.0 + 2.0 * soft) - soft;
  // escritura de izquierda a derecha con borde suave
  float reveal = 1.0 - smoothstep(p - soft, p, vUv.x);
  vec4 m = texture2D(map, vUv);
  float g = texture2D(grain, vUv * grainScale).r;
  float tooth = texture2D(grain, vUv * grainScale * 0.37 + 0.5).r;

  float ink = m.r * mix(1.0, g, inkGrain) * reveal * opacity;
  float hi = m.g * (0.72 + 0.28 * tooth) * reveal * opacity * 0.8;
  float pen = m.b * mix(1.0, g, inkGrain * 0.85) * reveal * opacity;

  vec3 f = (1.0 - ink * (1.0 - inkReflectance))
         * (1.0 - hi * (1.0 - highlightColor))
         * (1.0 - pen * (1.0 - pencilColor));
  gl_FragColor = vec4(f, 1.0);
}
`;

// Capa de LUZ holográfica: color con transparencia, compuesto encima de la tinta
const LIGHT_FRAG = /* glsl */ `
uniform sampler2D map;
uniform float progress;
uniform float opacity;
varying vec2 vUv;
void main() {
  const float soft = 0.06;
  float p = progress * (1.0 + 2.0 * soft) - soft;
  float reveal = 1.0 - smoothstep(p - soft, p, vUv.x);
  vec4 c = texture2D(map, vUv);
  float a = c.a * reveal * opacity;
  gl_FragColor = vec4(c.rgb * a, a); // premultiplicado: luz holográfica visible sobre papel claro u oscuro
}
`;

/** Textura de "diente" del papel / grano de grafito, procedural. */
function createGrainTexture(): THREE.Texture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.Texture();
  const img = ctx.createImageData(size, size);
  const rand = (x: number, y: number) => {
    const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return s - Math.floor(s);
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const fine = rand(x, y);
      const coarse = rand(Math.floor(x / 4), Math.floor(y / 4));
      const streak = 0.5 + 0.5 * Math.sin((x + y * 0.35) * 0.9 + rand(Math.floor(y / 3), 7) * 6.28);
      const v = 0.42 + 0.3 * fine + 0.18 * coarse + 0.1 * streak;
      const c = Math.round(Math.min(1, v) * 255);
      const i = (y * size + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = c;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

export class PaperARScene {
  readonly canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(0, 1, 0, 1, -10, 10);
  private anchor = new THREE.Group();
  private lightRenderer: THREE.WebGLRenderer;
  private lightScene = new THREE.Scene();
  private lightAnchor = new THREE.Group();
  private lightLayers: { material: THREE.ShaderMaterial; layer: number }[] = [];
  private animated: { textures: THREE.Texture[]; dirty: boolean }[] = [];
  /** Se llama en cada fotograma antes de renderizar (simulaciones). */
  onFrame?: (dt: number) => void;
  private grain: THREE.Texture;
  private layers: SceneLayer[] = [];
  private ink: InkUniforms;
  private raf = 0;
  private lastTime = 0;
  private resizeObserver: ResizeObserver;
  private disposed = false;

  private container: HTMLElement;
  private media: MediaSource;
  private tracker: HybridPaperTracker | null;
  /** Tamaño (px) del espacio de seguimiento = fotograma capturado reducido. */
  private space: { width: number; height: number };
  private display = { scale: 1, ox: 0, oy: 0 };

  private status: TrackingStatus;
  private lostSince = 0;
  private globalOpacity = 1;

  private playing = false;
  private playIndex = 0;
  private pauseUntil = 0;

  onStatus?: (status: TrackingStatus) => void;
  onLayerStart?: (index: number) => void;
  onSequenceEnd?: () => void;

  constructor(
    container: HTMLElement,
    media: MediaSource,
    ink: InkUniforms,
    space: { width: number; height: number },
    tracker: HybridPaperTracker | null,
  ) {
    this.container = container;
    this.media = media;
    this.ink = ink;
    this.space = space;
    this.tracker = tracker;
    this.status = tracker ? (tracker.state === 'tracking' ? 'tracking' : 'lost') : 'static';

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, premultipliedAlpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0xffffff, 1);
    this.canvas = this.renderer.domElement;
    Object.assign(this.canvas.style, {
      position: 'absolute',
      inset: '0',
      width: '100%',
      height: '100%',
      mixBlendMode: 'multiply',
      pointerEvents: 'none',
      opacity: '0',
      transition: 'opacity 450ms ease',
    } satisfies Partial<CSSStyleDeclaration>);
    container.appendChild(this.canvas);

    this.lightRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, premultipliedAlpha: true });
    this.lightRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.lightRenderer.setClearColor(0x000000, 0);
    Object.assign(this.lightRenderer.domElement.style, {
      position: 'absolute',
      inset: '0',
      width: '100%',
      height: '100%',
      mixBlendMode: 'normal',
      pointerEvents: 'none',
      opacity: '0',
      transition: 'opacity 450ms ease',
    } satisfies Partial<CSSStyleDeclaration>);
    container.appendChild(this.lightRenderer.domElement);
    this.lightAnchor.matrixAutoUpdate = false;
    this.lightScene.add(this.lightAnchor);

    this.anchor.matrixAutoUpdate = false;
    this.scene.add(this.anchor);
    this.grain = createGrainTexture();

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();

    requestAnimationFrame(() => {
      this.canvas.style.opacity = '1';
      this.lightRenderer.domElement.style.opacity = '1';
    });
    this.lastTime = performance.now();
    this.raf = requestAnimationFrame(this.tick);
  }

  get trackingStatus(): TrackingStatus {
    return this.status;
  }

  /** Cómo se dibuja el medio (object-fit) → transformación px de seguimiento → px de pantalla. */
  private resize() {
    const cw = this.container.clientWidth || 1;
    const ch = this.container.clientHeight || 1;
    this.renderer.setSize(cw, ch, false);
    this.lightRenderer.setSize(cw, ch, false);
    this.camera.left = 0;
    this.camera.right = cw;
    this.camera.top = 0;
    this.camera.bottom = ch;
    this.camera.updateProjectionMatrix();

    const { width: sw, height: sh } = this.space;
    const scale = this.media.fit === 'cover' ? Math.max(cw / sw, ch / sh) : Math.min(cw / sw, ch / sh);
    this.display = { scale, ox: (cw - sw * scale) / 2, oy: (ch - sh * scale) / 2 };
  }

  private setStatus(status: TrackingStatus) {
    if (this.status === status) return;
    this.status = status;
    this.onStatus?.(status);
  }

  // ------------------------------------------------------------------
  // Capas de tinta
  // ------------------------------------------------------------------
  addLayer(source: HTMLCanvasElement, place: LayerPlacement, durationSec: number): number {
    const sw = this.space.width;
    // unidades del ancla → px del fotograma (u a la derecha, v hacia abajo)
    const u = (place.x + 0.5) * sw;
    const v = this.space.height / 2 - place.y * sw;
    const w = place.w * sw;
    const h = place.h * sw;

    const tex = new THREE.CanvasTexture(source);
    tex.colorSpace = THREE.NoColorSpace;
    tex.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    const material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: {
        map: { value: tex },
        grain: { value: this.grain },
        grainScale: { value: new THREE.Vector2(source.width / 170, source.height / 170) },
        progress: { value: 0 },
        opacity: { value: 1 },
        inkGrain: { value: this.ink.inkGrain },
        inkReflectance: { value: new THREE.Vector3(...this.ink.inkReflectance) },
        highlightColor: { value: new THREE.Color(this.ink.highlightColor) },
        pencilColor: { value: new THREE.Color(this.ink.pencilColor) },
      },
      side: THREE.DoubleSide,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.ZeroFactor,
      blendDst: THREE.SrcColorFactor,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
    // eje y hacia abajo: se invierte el plano para que la textura no quede de cabeza
    mesh.scale.y = -1;
    // la matriz del ancla es proyectiva: el cálculo de esferas envolventes no aplica
    mesh.frustumCulled = false;
    mesh.position.set(u + w / 2, v + h / 2, 0);
    this.anchor.add(mesh);
    this.layers.push({ mesh, material, duration: Math.max(0.35, durationSec), progress: 0 });
    return this.layers.length - 1;
  }

  /**
   * Capa animada (simulación): `ink` se mezcla como tinta y `light` como luz. Ambos lienzos se
   * vuelven a subir a la GPU cuando se llama a `markDirty`.
   */
  addAnimatedLayer(ink: HTMLCanvasElement, light: HTMLCanvasElement, place: LayerPlacement, durationSec: number): number {
    const index = this.addLayer(ink, place, durationSec);
    const inkTex = this.layers[index].material.uniforms.map.value as THREE.Texture;
    inkTex.generateMipmaps = false;
    inkTex.minFilter = THREE.LinearFilter;

    const sw = this.space.width;
    const w = place.w * sw;
    const h = place.h * sw;
    const tex = new THREE.CanvasTexture(light);
    tex.colorSpace = THREE.NoColorSpace;
    tex.generateMipmaps = false;
    tex.minFilter = THREE.LinearFilter;
    const material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: LIGHT_FRAG,
      uniforms: { map: { value: tex }, progress: { value: 0 }, opacity: { value: 1 } },
      side: THREE.DoubleSide,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
    mesh.scale.y = -1;
    mesh.frustumCulled = false;
    const src = this.layers[index].mesh.position;
    mesh.position.set(src.x, src.y, 0);
    this.lightAnchor.add(mesh);
    this.lightLayers.push({ material, layer: index });
    this.animated.push({ textures: [inkTex, tex], dirty: true });
    return this.animated.length - 1;
  }

  markDirty(handle: number) {
    const a = this.animated[handle];
    if (a) a.dirty = true;
  }

  /** Reproduce la escritura de todas las capas desde `from` (las anteriores quedan escritas). */
  play(from = 0) {
    this.layers.forEach((layer, i) => {
      layer.progress = i < from ? 1 : 0;
      layer.material.uniforms.progress.value = layer.progress;
    });
    this.playIndex = from;
    this.playing = this.layers.length > from;
    this.pauseUntil = performance.now() + 250;
    if (this.playing) this.onLayerStart?.(from);
  }

  /** Muestra todo sin animación. */
  showAll() {
    this.playing = false;
    this.layers.forEach((layer) => {
      layer.progress = 1;
      layer.material.uniforms.progress.value = 1;
    });
    this.onSequenceEnd?.();
  }

  get layerCount() {
    return this.layers.length;
  }

  // ------------------------------------------------------------------
  // Bucle de render
  // ------------------------------------------------------------------
  private tick = (now: number) => {
    if (this.disposed) return;
    const dt = Math.min(0.1, (now - this.lastTime) / 1000);
    this.lastTime = now;

    // Animación de escritura secuencial
    if (this.playing && now >= this.pauseUntil) {
      const layer = this.layers[this.playIndex];
      if (layer) {
        layer.progress = Math.min(1, layer.progress + dt / layer.duration);
        layer.material.uniforms.progress.value = layer.progress;
        if (layer.progress >= 1) {
          this.playIndex++;
          this.pauseUntil = now + 380;
          if (this.playIndex >= this.layers.length) {
            this.playing = false;
            this.onSequenceEnd?.();
          } else {
            this.onLayerStart?.(this.playIndex);
          }
        }
      }
    }

    this.onFrame?.(dt);
    for (const a of this.animated) {
      if (!a.dirty) continue;
      for (const t of a.textures) t.needsUpdate = true;
      a.dirty = false;
    }

    // Homografía: px del fotograma capturado → px de pantalla
    const t = this.tracker;
    const h = t ? t.getHomography() : [1, 0, 0, 0, 1, 0, 0, 0, 1];
    if (t) {
      if (t.state === 'tracking') {
        this.lostSince = 0;
        this.setStatus('tracking');
      } else {
        if (!this.lostSince) this.lostSince = now;
        this.setStatus('lost');
      }
    }
    const { scale: s, ox, oy } = this.display;
    // D·H con D = escala + desplazamiento del object-fit
    const m = [
      s * h[0] + ox * h[6], s * h[1] + ox * h[7], s * h[2] + ox * h[8],
      s * h[3] + oy * h[6], s * h[4] + oy * h[7], s * h[5] + oy * h[8],
      h[6], h[7], h[8],
    ];
    this.anchor.matrix.set(
      m[0], m[1], 0, m[2],
      m[3], m[4], 0, m[5],
      0, 0, 1, 0,
      m[6], m[7], 0, m[8],
    );
    this.anchor.matrixWorldNeedsUpdate = true;
    this.lightAnchor.matrix.copy(this.anchor.matrix);
    this.lightAnchor.matrixWorldNeedsUpdate = true;

    // Si se pierde la hoja, la tinta se desvanece en lugar de flotar en el aire
    const lostFor = this.lostSince ? now - this.lostSince : 0;
    const targetOpacity = this.status === 'lost' && lostFor > 350 ? 0.1 : 1;
    this.globalOpacity += (targetOpacity - this.globalOpacity) * Math.min(1, dt * 6);
    for (const layer of this.layers) layer.material.uniforms.opacity.value = this.globalOpacity;
    for (const l of this.lightLayers) {
      l.material.uniforms.opacity.value = this.globalOpacity;
      l.material.uniforms.progress.value = this.layers[l.layer].progress;
    }

    this.renderer.render(this.scene, this.camera);
    if (this.lightLayers.length) this.lightRenderer.render(this.lightScene, this.camera);
    this.raf = requestAnimationFrame(this.tick);
  };

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.resizeObserver.disconnect();
    for (const layer of this.layers) {
      layer.mesh.geometry.dispose();
      (layer.material.uniforms.map.value as THREE.Texture).dispose();
      layer.material.dispose();
    }
    for (const l of this.lightLayers) {
      (l.material.uniforms.map.value as THREE.Texture).dispose();
      l.material.dispose();
    }
    this.grain.dispose();
    this.renderer.dispose();
    this.lightRenderer.dispose();
    this.canvas.remove();
    this.lightRenderer.domElement.remove();
  }
}
