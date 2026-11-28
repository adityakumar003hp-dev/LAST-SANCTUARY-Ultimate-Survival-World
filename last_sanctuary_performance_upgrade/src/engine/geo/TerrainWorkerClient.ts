/**
 * Client wrapper around terrain.worker.ts for asynchronous pre-fetching of Earth chunk elevations.
 * Automatically falls back safely if Web Workers are unavailable.
 */

import type { TerrainWorkerRequest, TerrainWorkerResponse } from './terrain.worker';

export class TerrainWorkerClient {
  private worker: Worker | null = null;
  private nextRequestId = 1;
  private pending = new Map<
    number,
    { resolve: (res: TerrainWorkerResponse) => void; reject: (err: Error) => void }
  >();

  constructor() {
    if (typeof Worker !== 'undefined') {
      try {
        this.worker = new Worker(new URL('./terrain.worker.ts', import.meta.url), { type: 'module' });
        this.worker.onmessage = (event: MessageEvent<TerrainWorkerResponse>) => {
          const entry = this.pending.get(event.data.requestId);
          if (entry) {
            this.pending.delete(event.data.requestId);
            entry.resolve(event.data);
          }
        };
        this.worker.onerror = () => {
          this.dispose();
        };
      } catch {
        this.worker = null;
      }
    }
  }

  public isAvailable(): boolean {
    return this.worker !== null;
  }

  public computeChunkHeightsAsync(
    params: Omit<TerrainWorkerRequest, 'requestId'>
  ): Promise<TerrainWorkerResponse> | null {
    if (!this.worker) return null;
    const requestId = this.nextRequestId++;
    return new Promise((resolve, reject) => {
      this.pending.set(requestId, { resolve, reject });
      this.worker!.postMessage({ ...params, requestId });
    });
  }

  public dispose() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.pending.forEach((p) => p.reject(new Error('TerrainWorkerClient disposed')));
    this.pending.clear();
  }
}
