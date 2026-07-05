export type TransitionType = 'fade' | 'slide-left' | 'slide-right' | 'slide-up' | 'scale' | 'mask-reveal';

export interface TransitionConfig {
  type: TransitionType;
  duration: number;
  easing: string;
}

export const transitionPresets: Record<TransitionType, TransitionConfig> = {
  'fade': { type: 'fade', duration: 400, easing: 'cubic-bezier(0.65, 0, 0.35, 1)' },
  'slide-left': { type: 'slide-left', duration: 500, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
  'slide-right': { type: 'slide-right', duration: 500, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
  'slide-up': { type: 'slide-up', duration: 500, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
  'scale': { type: 'scale', duration: 400, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
  'mask-reveal': { type: 'mask-reveal', duration: 800, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
};

export function getTransitionStyles(
  config: TransitionConfig,
  phase: 'enter' | 'exit'
): Record<string, string> {
  const transition = `all ${config.duration}ms ${config.easing}`;

  const styles: Record<TransitionType, Record<string, Record<string, string>>> = {
    'fade': {
      enter: { opacity: '0', transition },
      exit: { opacity: '0', transition },
    },
    'slide-left': {
      enter: { opacity: '0', transform: 'translateX(30px)', transition },
      exit: { opacity: '0', transform: 'translateX(-30px)', transition },
    },
    'slide-right': {
      enter: { opacity: '0', transform: 'translateX(-30px)', transition },
      exit: { opacity: '0', transform: 'translateX(30px)', transition },
    },
    'slide-up': {
      enter: { opacity: '0', transform: 'translateY(30px)', transition },
      exit: { opacity: '0', transform: 'translateY(-30px)', transition },
    },
    'scale': {
      enter: { opacity: '0', transform: 'scale(0.95)', transition },
      exit: { opacity: '0', transform: 'scale(1.05)', transition },
    },
    'mask-reveal': {
      enter: { clipPath: 'inset(100% 0 0 0)', transition },
      exit: { clipPath: 'inset(0 0 100% 0)', transition },
    },
  };

  return styles[config.type][phase];
}

export function shouldAnimateTransition(): boolean {
  if (typeof window === 'undefined') return true;
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
