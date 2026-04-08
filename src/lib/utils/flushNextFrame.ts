/** Two rAFs so React can paint before heavy sync work (e.g. thinking-phase UI). */
export function flushNextFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}
