// SVG text → canvas, rendered by the browser itself so everything Illustrator exports
// (transforms, CSS classes, gradients, clip paths) looks exactly as authored.
import { ImageSource, Texture } from 'pixi.js';
import { applyVisibility, browserDom, rootSvg, sizeRoot, viewBoxOf, type VisibilityRule } from './svgDoc';

export interface Raster {
  canvas: HTMLCanvasElement;
  /** Art-space position of the canvas top-left. */
  x: number;
  y: number;
  /** Canvas pixels per art unit. */
  ppu: number;
}

let liveTextures = 0;
export const rasterStats = () => ({ liveTextures });

/**
 * CPU-backed 2D canvases: GPU-backed ones can silently lose their pixels (context loss / memory
 * pressure) before Pixi uploads them, which shows up as invisible parts.
 */
export function makeCanvas(w: number, h: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.ceil(w));
  canvas.height = Math.max(1, Math.ceil(h));
  return { canvas, ctx: canvas.getContext('2d', { willReadFrequently: true })! };
}

async function drawSvg(text: string, w: number, h: number): Promise<HTMLCanvasElement> {
  const img = new Image();
  img.decoding = 'async';
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(text);
  await img.decode();
  const { canvas, ctx } = makeCanvas(w, h);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/** Crop to the drawn pixels (plus padding). */
function trim(canvas: HTMLCanvasElement, pad = 2): { canvas: HTMLCanvasElement; dx: number; dy: number } {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const { width: w, height: h } = canvas;
  const data = ctx.getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    const row = y * w * 4;
    for (let x = 0; x < w; x++) {
      if (data[row + x * 4 + 3] > 2) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return { canvas, dx: 0, dy: 0 };
  x0 = Math.max(0, x0 - pad);
  y0 = Math.max(0, y0 - pad);
  x1 = Math.min(w - 1, x1 + pad);
  y1 = Math.min(h - 1, y1 + pad);
  const out = makeCanvas(x1 - x0 + 1, y1 - y0 + 1);
  out.ctx.drawImage(canvas, -x0, -y0);
  return { canvas: out.canvas, dx: x0, dy: y0 };
}

/** Rasterize (part of) an SVG at `ppu` canvas pixels per art unit. */
export async function rasterize(svg: string, ppu: number, rule?: VisibilityRule, doTrim = true): Promise<Raster> {
  const doc = browserDom.parse(svg);
  const root = rootSvg(doc);
  if (rule) applyVisibility(root, rule);
  const vb = viewBoxOf(root);
  sizeRoot(root, vb, ppu);
  const full = await drawSvg(browserDom.serialize(doc), Math.ceil(vb.w * ppu), Math.ceil(vb.h * ppu));
  if (!doTrim) return { canvas: full, x: vb.x, y: vb.y, ppu };
  const t = trim(full);
  return { canvas: t.canvas, x: vb.x + t.dx / ppu, y: vb.y + t.dy / ppu, ppu };
}

/**
 * Texture whose size is in art units (canvas pixels / ppu).
 * ImageSource, not CanvasSource: CanvasSource re-derives the pixel size as (w / ppu) × ppu and,
 * on float round-off, resets canvas.width, which wipes the canvas.
 */
export function toTexture(r: { canvas: HTMLCanvasElement; ppu: number }): Texture {
  liveTextures++;
  return new Texture({ source: new ImageSource({ resource: r.canvas, resolution: r.ppu, autoGenerateMipmaps: false }) });
}

export function destroyTexture(t: Texture): void {
  if (t.destroyed) return;
  liveTextures--;
  t.destroy(true);
}

/** Overlay effects (mud, wet shine) that only appear where the body is drawn. */
export function bakeOverlay(body: HTMLCanvasElement, paint: (ctx: CanvasRenderingContext2D, w: number, h: number) => void): HTMLCanvasElement {
  const { canvas: c, ctx } = makeCanvas(body.width, body.height);
  paint(ctx, c.width, c.height);
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(body, 0, 0);
  return c;
}
