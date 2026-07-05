export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function watchReducedMotion(callback: (reduced: boolean) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
  const handler = (e: MediaQueryListEvent) => callback(e.matches);
  mql.addEventListener('change', handler);
  return () => mql.removeEventListener('change', handler);
}

export type MotionPurpose =
  | 'reveal' | 'focus' | 'transition' | 'spatial'
  | 'inspection' | 'confirmation' | 'rejection'
  | 'loading' | 'navigation' | 'atmosphere';

export interface MotionPreset {
  duration: number;
  easing: string;
  keyframes: Keyframe[];
}

export const motionPresets: Record<MotionPurpose, MotionPreset> = {
  reveal: {
    duration: 600,
    easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
    keyframes: [
      { opacity: 0, transform: 'translateY(30px)' },
      { opacity: 1, transform: 'translateY(0)' },
    ],
  },
  focus: {
    duration: 300,
    easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    keyframes: [
      { transform: 'scale(1)' },
      { transform: 'scale(1.05)' },
      { transform: 'scale(1)' },
    ],
  },
  transition: {
    duration: 500,
    easing: 'cubic-bezier(0.65, 0, 0.35, 1)',
    keyframes: [
      { opacity: 0 },
      { opacity: 1 },
    ],
  },
  spatial: {
    duration: 800,
    easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
    keyframes: [
      { transform: 'translateZ(-100px) scale(0.8)', opacity: 0 },
      { transform: 'translateZ(0) scale(1)', opacity: 1 },
    ],
  },
  inspection: {
    duration: 600,
    easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    keyframes: [
      { transform: 'scale(1)' },
      { transform: 'scale(2)', transformOrigin: 'center center' },
    ],
  },
  confirmation: {
    duration: 400,
    easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    keyframes: [
      { transform: 'scale(1)' },
      { transform: 'scale(1.1)' },
      { transform: 'scale(1)' },
    ],
  },
  rejection: {
    duration: 300,
    easing: 'cubic-bezier(0.4, 0, 1, 1)',
    keyframes: [
      { transform: 'translateX(0)' },
      { transform: 'translateX(-4px)' },
      { transform: 'translateX(4px)' },
      { transform: 'translateX(-4px)' },
      { transform: 'translateX(0)' },
    ],
  },
  loading: {
    duration: 1000,
    easing: 'cubic-bezier(0.65, 0, 0.35, 1)',
    keyframes: [
      { opacity: 0.3 },
      { opacity: 1 },
    ],
  },
  navigation: {
    duration: 400,
    easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
    keyframes: [
      { opacity: 0, transform: 'translateX(-20px)' },
      { opacity: 1, transform: 'translateX(0)' },
    ],
  },
  atmosphere: {
    duration: 3000,
    easing: 'linear',
    keyframes: [
      { transform: 'translateY(0)' },
      { transform: 'translateY(-20px)' },
      { transform: 'translateY(0)' },
    ],
  },
};

export function animateElement(
  el: HTMLElement,
  purpose: MotionPurpose,
  options?: { delay?: number; duration?: number; onComplete?: () => void }
): Animation | null {
  if (prefersReducedMotion()) {
    el.style.opacity = '1';
    el.style.transform = 'none';
    options?.onComplete?.();
    return null;
  }

  const preset = motionPresets[purpose];
  const animation = el.animate(preset.keyframes, {
    duration: options?.duration ?? preset.duration,
    easing: preset.easing,
    delay: options?.delay ?? 0,
    fill: 'forwards',
  });

  if (options?.onComplete) {
    animation.onfinish = options.onComplete;
  }

  return animation;
}

export function staggerChildren(
  container: HTMLElement,
  selector: string,
  purpose: MotionPurpose,
  staggerMs: number = 100
): Animation[] {
  const children = container.querySelectorAll<HTMLElement>(selector);
  return Array.from(children)
    .map((child, i) => animateElement(child, purpose, { delay: i * staggerMs }))
    .filter((a): a is Animation => a !== null);
}
