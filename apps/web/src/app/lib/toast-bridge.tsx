import React from 'react';
import {
  GooeyToaster as PrimitiveGooeyToaster,
  gooeyToast,
  type GooeyToasterProps,
  type GooeyToastOptions,
  type GooeyPromiseData,
} from 'goey-toast';
import { toast as realSonnerToast } from 'sonner';
import 'goey-toast/styles.css';

// Re-export types
export type {
  GooeyToasterProps,
  GooeyToastOptions,
  GooeyPromiseData,
};

/**
 * Resolves theme dynamically based on HTML/body class:
 * - When in Light (white) or Cream mode: toast is 'dark' (dark blob)
 * - When in Dark mode: toast is 'light' (white/light blob)
 */
export function resolveAutoGooeyTheme(): 'light' | 'dark' {
  if (typeof document === 'undefined') return 'dark';
  const isAppDark =
    document.documentElement.classList.contains('theme-dark') ||
    document.body.classList.contains('theme-dark');

  return isAppDark ? 'light' : 'dark';
}

export interface AppGooeyToasterProps extends Omit<GooeyToasterProps, 'theme'> {
  theme?: 'light' | 'dark' | 'auto';
}

/**
 * GooeyToaster mounted at top-left with dynamic contrast theme,
 * bouncy spring animation, and countdown progress bar.
 */
export function GooeyToaster({
  position = 'top-left',
  theme = 'auto',
  showProgress = true,
  closeButton = 'top-right',
  bounce = 0.4,
  ...props
}: AppGooeyToasterProps) {
  const [activeTheme, setActiveTheme] = React.useState<'light' | 'dark'>(() =>
    theme === 'auto' ? resolveAutoGooeyTheme() : theme
  );

  React.useEffect(() => {
    if (theme !== 'auto') {
      setActiveTheme(theme);
      return;
    }

    const updateTheme = () => {
      setActiveTheme(resolveAutoGooeyTheme());
    };

    updateTheme();

    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    if (document.body) {
      observer.observe(document.body, {
        attributes: true,
        attributeFilter: ['class'],
      });
    }

    return () => observer.disconnect();
  }, [theme]);

  return (
    <PrimitiveGooeyToaster
      position={position}
      theme={activeTheme}
      showProgress={showProgress}
      closeButton={closeButton}
      bounce={bounce}
      {...props}
    />
  );
}

export const Toaster = GooeyToaster;

function normalizeTitle(msg: any): string {
  if (typeof msg === 'string') return msg;
  if (msg === null || msg === undefined) return '';
  if (typeof msg === 'object' && msg.message) return String(msg.message);
  return String(msg);
}

function normalizeOptions(options?: any): GooeyToastOptions {
  if (!options) return { showProgress: true };
  const { description, duration, action, id, ...rest } = options;
  return {
    description,
    duration,
    action: action
      ? {
          label: action.label || 'Action',
          onClick: action.onClick || (() => {}),
        }
      : undefined,
    id,
    showProgress: true,
    ...rest,
  };
}

/**
 * Unified toast helper compatible with both gooeyToast and Sonner's toast(...) API.
 */
const toastFn = (message: any, data?: any) => {
  return gooeyToast(normalizeTitle(message), normalizeOptions(data));
};

export const toast = Object.assign(toastFn, {
  success: (message: any, data?: any) =>
    gooeyToast.success(normalizeTitle(message), normalizeOptions(data)),
  error: (message: any, data?: any) =>
    gooeyToast.error(normalizeTitle(message), normalizeOptions(data)),
  warning: (message: any, data?: any) =>
    gooeyToast.warning(normalizeTitle(message), normalizeOptions(data)),
  info: (message: any, data?: any) =>
    gooeyToast.info(normalizeTitle(message), normalizeOptions(data)),
  message: (message: any, data?: any) =>
    gooeyToast(normalizeTitle(message), normalizeOptions(data)),
  loading: (message: any, data?: any) =>
    gooeyToast(normalizeTitle(message), normalizeOptions(data)),
  promise: <T,>(promise: Promise<T>, data: GooeyPromiseData<T>) =>
    gooeyToast.promise(promise, data),
  dismiss: (id?: string | number) => gooeyToast.dismiss(id),
  update: gooeyToast.update,
  custom: realSonnerToast.custom,
});

export { gooeyToast };
export default toast;
