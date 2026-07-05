export interface ScrollState {
  scrollY: number;
  progress: number;
  maxScroll: number;
  direction: 'up' | 'down' | 'none';
  velocity: number;
}

export function createScrollTracker(
  container: HTMLElement | Window = window,
  onUpdate: (state: ScrollState) => void
): () => void {
  let lastY = 0;
  let lastTime = performance.now();
  let rafId: number;

  function tick() {
    const el = container === window ? document.documentElement : (container as HTMLElement);
    const scrollY = container === window ? window.scrollY : (container as HTMLElement).scrollTop;
    const maxScroll = container === window
      ? document.documentElement.scrollHeight - window.innerHeight
      : (container as HTMLElement).scrollHeight - (container as HTMLElement).clientHeight;
    const now = performance.now();
    const dt = now - lastTime;
    const velocity = dt > 0 ? (scrollY - lastY) / dt : 0;

    onUpdate({
      scrollY,
      progress: maxScroll > 0 ? scrollY / maxScroll : 0,
      maxScroll,
      direction: scrollY > lastY ? 'down' : scrollY < lastY ? 'up' : 'none',
      velocity,
    });

    lastY = scrollY;
    lastTime = now;
    rafId = requestAnimationFrame(tick);
  }

  rafId = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(rafId);
}

export function scrollTo(
  target: number | HTMLElement,
  options?: { smooth?: boolean; offset?: number }
): void {
  const prefersReduced = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const targetY = typeof target === 'number'
    ? target
    : target.getBoundingClientRect().top + window.scrollY + (options?.offset ?? 0);

  window.scrollTo({
    top: targetY,
    behavior: options?.smooth === false || prefersReduced ? 'auto' : 'smooth',
  });
}

export function useScrollProgress(
  container: HTMLElement | null
): { progress: number } {
  if (!container) return { progress: 0 };
  const scrollTop = container.scrollTop;
  const maxScroll = container.scrollHeight - container.clientHeight;
  return { progress: maxScroll > 0 ? Math.min(1, Math.max(0, scrollTop / maxScroll)) : 0 };
}
