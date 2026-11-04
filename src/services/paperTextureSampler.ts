import type { ExtractedPaperStyle } from '../types/simulator';

/**
 * Samples the captured notebook frame or photo to extract:
 * 1. Paper tint (warm notebook cream, pure white, or dark mode)
 * 2. Graphite pencil tone (graphite 2B, HB grey, or ink black)
 * 3. Contrast ratio and stroke luminescence
 *
 * This allows AR objects to borrow the physical pencil's texture and color,
 * making drawn items look genuinely alive and animated.
 */
export function samplePaperStyleFromImage(
  imageSource: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
): ExtractedPaperStyle {
  try {
    const canvas = document.createElement('canvas');
    const width = 120;
    const height = 120;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      return getDefaultPaperStyle();
    }

    ctx.drawImage(imageSource, 0, 0, width, height);
    const imgData = ctx.getImageData(0, 0, width, height).data;

    let minBrightness = 255;
    let maxBrightness = 0;
    let darkestR = 40, darkestG = 40, darkestB = 40;
    let brightestR = 245, brightestG = 240, brightestB = 230;

    // Sample across grid
    const step = 4 * 4; // Sample every 4th pixel
    for (let i = 0; i < imgData.length; i += step) {
      const r = imgData[i];
      const g = imgData[i + 1];
      const b = imgData[i + 2];
      const brightness = 0.299 * r + 0.587 * g + 0.114 * b;

      if (brightness < minBrightness) {
        minBrightness = brightness;
        darkestR = r;
        darkestG = g;
        darkestB = b;
      }

      if (brightness > maxBrightness) {
        maxBrightness = brightness;
        brightestR = r;
        brightestG = g;
        brightestB = b;
      }
    }

    const contrast = maxBrightness > 0 ? (maxBrightness - minBrightness) / maxBrightness : 0.8;

    return {
      paperColor: `rgb(${brightestR}, ${brightestG}, ${brightestB})`,
      graphiteColor: `rgb(${darkestR}, ${darkestG}, ${darkestB})`,
      strokeIntensity: Math.min(Math.max(1 - minBrightness / 255, 0.4), 1.0),
      contrastRatio: contrast,
      highlightColor: '#00f0ff'
    };
  } catch {
    return getDefaultPaperStyle();
  }
}

export function getDefaultPaperStyle(): ExtractedPaperStyle {
  return {
    paperColor: '#f7f4ea',
    graphiteColor: '#1e2430',
    strokeIntensity: 0.85,
    contrastRatio: 0.88,
    highlightColor: '#00f0ff'
  };
}

