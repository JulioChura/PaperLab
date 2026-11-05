/** Tipos mínimos de jsfeat 0.0.8 (la librería no trae los suyos). */
declare module 'jsfeat' {
  namespace jsfeat {
    class matrix_t {
      constructor(cols: number, rows: number, dataType: number, data?: unknown);
      cols: number;
      rows: number;
      data: Uint8Array | Float32Array | Int32Array;
    }
    class pyramid_t {
      constructor(levels: number);
      data: matrix_t[];
      allocate(width: number, height: number, dataType: number): void;
      build(input: matrix_t, skipFirstLevel?: boolean): void;
    }
    class keypoint_t {
      constructor(x?: number, y?: number, score?: number, level?: number, angle?: number);
      x: number;
      y: number;
      score: number;
      level: number;
      angle: number;
    }
    class ransac_params_t {
      constructor(size: number, thresh: number, eps: number, prob: number);
    }
    const U8_t: number;
    const C1_t: number;
    const F32_t: number;
    const COLOR_RGBA2GRAY: number;
    const imgproc: {
      grayscale(src: Uint8ClampedArray, w: number, h: number, dst: matrix_t, code?: number): void;
      warp_perspective(src: matrix_t, dst: matrix_t, transform: matrix_t, fillValue?: number): void;
    };
    const yape06: {
      laplacian_threshold: number;
      min_eigen_value_threshold: number;
      detect(img: matrix_t, points: keypoint_t[], border?: number): number;
    };
    const optical_flow_lk: {
      track(
        prev: pyramid_t, curr: pyramid_t, prevXY: Float32Array, currXY: Float32Array, count: number,
        winSize: number, maxIter: number, status: Uint8Array, eps: number, minEigenThreshold: number,
      ): void;
    };
    const motion_model: { homography2d: new () => unknown; affine2d: new () => unknown };
    const motion_estimator: {
      ransac(
        params: ransac_params_t, kernel: unknown, from: { x: number; y: number }[], to: { x: number; y: number }[],
        count: number, model: matrix_t, mask: matrix_t, maxIters?: number,
      ): boolean;
    };
  }
  export default jsfeat;
}
