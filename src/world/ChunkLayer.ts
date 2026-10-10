import { Container } from 'pixi.js';

/**
 * A parallax layer built lazily from fixed-width chunks, so only what is near
 * the camera exists. Chunk content is deterministic per index.
 */
export class ChunkLayer extends Container {
  private chunks = new Map<number, Container>();

  constructor(
    public factor: number,
    public chunkW: number,
    private build: (index: number, x0: number) => Container | null,
  ) {
    super();
  }

  /** camX: world x at the screen anchor. left/right: visible extents relative to anchor (layer units). */
  updateChunks(camX: number, left: number, right: number): void {
    const lx = camX * this.factor;
    const i0 = Math.floor((lx - left - 100) / this.chunkW);
    const i1 = Math.floor((lx + right + 100) / this.chunkW);
    for (const [i, c] of this.chunks) {
      if (i < i0 - 1 || i > i1 + 1) {
        c.destroy({ children: true });
        this.chunks.delete(i);
      }
    }
    for (let i = i0; i <= i1; i++) {
      if (!this.chunks.has(i)) {
        const c = this.build(i, i * this.chunkW) ?? new Container();
        this.chunks.set(i, c);
        this.addChild(c);
      }
    }
  }

  reset(): void {
    for (const c of this.chunks.values()) c.destroy({ children: true });
    this.chunks.clear();
  }
}
