export interface PerformanceBudget {
  jsBytes: number;
  fcp: number;
  lcp: number;
  tbt: number;
  cls: number;
}

export const FCW_PERFORMANCE_BUDGET: PerformanceBudget = {
  jsBytes: 200_000,
  fcp: 1500,
  lcp: 2500,
  tbt: 200,
  cls: 0.1,
};

export function monitorPerformance(onViolation: (metric: string, actual: number, budget: number) => void): () => void {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return () => {};

  const budget = FCW_PERFORMANCE_BUDGET;

  const lcpObserver = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const last = entries[entries.length - 1];
    if (last && last.startTime > budget.lcp) {
      onViolation('LCP', last.startTime, budget.lcp);
    }
  });
  lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

  const fcpObserver = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    if (entries.length > 0 && entries[0].startTime > budget.fcp) {
      onViolation('FCP', entries[0].startTime, budget.fcp);
    }
  });
  fcpObserver.observe({ type: 'paint', buffered: true });

  const clsObserver = new PerformanceObserver((list) => {
    let clsValue = 0;
    for (const entry of list.getEntries()) {
      if (!(entry as any).hadRecentInput) {
        clsValue += (entry as any).value;
      }
    }
    if (clsValue > budget.cls) {
      onViolation('CLS', clsValue, budget.cls);
    }
  });
  clsObserver.observe({ type: 'layout-shift', buffered: true });

  const tbtObserver = new PerformanceObserver((list) => {
    let tbt = 0;
    for (const entry of list.getEntries()) {
      const duration = entry.duration;
      if (duration > 50) {
        tbt += duration - 50;
      }
    }
    if (tbt > budget.tbt) {
      onViolation('TBT', tbt, budget.tbt);
    }
  });
  tbtObserver.observe({ type: 'longtask', buffered: true });

  return () => {
    lcpObserver.disconnect();
    fcpObserver.disconnect();
    clsObserver.disconnect();
    tbtObserver.disconnect();
  };
}

export function lazyLoadImage(
  img: HTMLImageElement,
  src: string,
  fallback?: string
): void {
  if ('loading' in HTMLImageElement.prototype) {
    img.loading = 'lazy';
    img.src = src;
  } else if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            img.src = src;
            observer.unobserve(img);
          }
        });
      },
      { rootMargin: '200px' }
    );
    if (fallback) img.src = fallback;
    observer.observe(img);
  } else {
    img.src = src;
  }
}

export function getAssetDimensions(
  containerWidth: number,
  displayPixelRatio: number = 2
): { width: number; density: string } {
  const cappedRatio = Math.min(displayPixelRatio, 2);
  return {
    width: Math.round(containerWidth * cappedRatio),
    density: `${cappedRatio}x`,
  };
}

export function isLowPowerDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const concurrency = navigator.hardwareConcurrency ?? 8;
  const memory = (navigator as any).deviceMemory ?? 8;
  const saveData = (navigator as any).connection?.saveData ?? false;
  return concurrency < 4 || memory < 4 || saveData;
}

export function reportWebVitals(): void {
  if (typeof window === 'undefined') return;
  monitorPerformance((metric, actual, budget) => {
    console.warn(`[FCW Perf] ${metric} budget exceeded: ${Math.round(actual)} (budget: ${budget})`);
  });
}
