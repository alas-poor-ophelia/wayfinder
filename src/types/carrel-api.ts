// Type-only mirror of Carrel's public API (the canonical source is Carrel's
// src/types/api.ts). MiniSheet depends on the SHAPE, not on Carrel at runtime —
// it reaches the implementation via app.plugins.getPlugin("carrel").api when
// Carrel is installed. Keep this in sync with Carrel's CarrelApi.

export interface CarrelReferenceHandle {
  unmount(): void;
  setCharacter(id: string): void;
}

export interface CarrelApi {
  readonly apiVersion: number;
  mountReferences(
    el: HTMLElement,
    opts: { characterId: string; mode: "sidebar" }
  ): CarrelReferenceHandle;
  getNookForCharacter(characterId: string): string | null;
  linkCharacterNook(characterId: string): string;
}
