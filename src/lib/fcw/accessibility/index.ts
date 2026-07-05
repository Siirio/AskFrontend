export function createFocusTrap(container: HTMLElement): { activate: () => void; deactivate: () => void } {
  const focusableSelector = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

  function getFocusableElements(): HTMLElement[] {
    return Array.from(container.querySelectorAll<HTMLElement>(focusableSelector))
      .filter(el => el.offsetParent !== null);
  }

  function handleKeyDown(e: KeyboardEvent): void {
    if (e.key !== 'Tab') return;
    const focusable = getFocusableElements();
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  let previousFocus: HTMLElement | null = null;

  return {
    activate() {
      previousFocus = document.activeElement as HTMLElement;
      container.addEventListener('keydown', handleKeyDown);
      const focusable = getFocusableElements();
      if (focusable.length > 0) focusable[0].focus();
    },
    deactivate() {
      container.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus();
    },
  };
}

export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  let announcer = document.getElementById('fcw-sr-announcer');
  if (!announcer) {
    announcer = document.createElement('div');
    announcer.id = 'fcw-sr-announcer';
    announcer.setAttribute('aria-live', priority);
    announcer.setAttribute('aria-atomic', 'true');
    announcer.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap';
    document.body.appendChild(announcer);
  }
  announcer.setAttribute('aria-live', priority);
  announcer.textContent = '';
  requestAnimationFrame(() => {
    announcer.textContent = message;
  });
}

export function getFocusableElements(container: HTMLElement = document.body): HTMLElement[] {
  const selector = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
  return Array.from(container.querySelectorAll<HTMLElement>(selector));
}

export function skipToContent(id: string = 'main-content'): void {
  const link = document.createElement('a');
  link.href = `#${id}`;
  link.className = 'fcw-skip-link';
  link.textContent = 'Skip to main content';
  link.style.cssText = 'position:absolute;top:-100%;left:0;z-index:9999;padding:8px 16px;background:var(--fcw-color-primary,#ff5a1f);color:#170b05;font-weight:600;text-decoration:none;';
  link.addEventListener('focus', () => { link.style.top = '0'; });
  link.addEventListener('blur', () => { link.style.top = '-100%'; });
  document.body.prepend(link);
}
