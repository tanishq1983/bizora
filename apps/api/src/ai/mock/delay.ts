/**
 * A small artificial latency so the loading states in the UI are actually
 * exercised during a demo. Long enough to see the staged progress, short
 * enough not to cost demo time.
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}