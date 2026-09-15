import React, { useEffect, useState } from 'react';
import {
  GooeyToaster as PrimitiveGooeyToaster,
  gooeyToast,
  type GooeyToasterProps,
  type GooeyToastOptions,
  type GooeyPromiseData,
} from 'goey-toast';
import 'goey-toast/styles.css';

export type {
  GooeyToasterProps,
  GooeyToastOptions,
  GooeyPromiseData,
};

/**
 * Computes the toast theme based on the active app theme:
 * - When app is in Light (white) or Cream mode: toast is 'dark' (dark blob with light text)
 * - When app is in Dark mode: toast is 'light' (white/light blob with dark text)
 */
function resolveAutoGooeyTheme(): 'light' | 'dark' {
  if (typeof document === 'undefined') return 'dark';
  const isAppDark =
    document.documentElement.classList.contains('theme-dark') ||
    document.body.classList.contains('theme-dark');

  // Inverse contrast as requested: dark app -> white/light toast, light/cream app -> dark toast
  return isAppDark ? 'light' : 'dark';
}

export interface AppGooeyToasterProps extends Omit<GooeyToasterProps, 'theme'> {
  theme?: 'light' | 'dark' | 'auto';
}

export function GooeyToaster({
  position = 'top-left',
  theme = 'auto',
  showProgress = true,
  closeButton = 'top-right',
  bounce = 0.4,
  ...props
}: AppGooeyToasterProps) {
  const [activeTheme, setActiveTheme] = useState<'light' | 'dark'>(() =>
    theme === 'auto' ? resolveAutoGooeyTheme() : theme
  );

  useEffect(() => {
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

/**
 * Enhanced toast helper with default showProgress = true and rich blob styling.
 */
export const toast = Object.assign(
  (title: string, options?: GooeyToastOptions) =>
    gooeyToast(title, { showProgress: true, ...options }),
  {
    success: (title: string, options?: GooeyToastOptions) =>
      gooeyToast.success(title, { showProgress: true, ...options }),
    error: (title: string, options?: GooeyToastOptions) =>
      gooeyToast.error(title, { showProgress: true, ...options }),
    warning: (title: string, options?: GooeyToastOptions) =>
      gooeyToast.warning(title, { showProgress: true, ...options }),
    info: (title: string, options?: GooeyToastOptions) =>
      gooeyToast.info(title, { showProgress: true, ...options }),
    loading: (title: string, options?: GooeyToastOptions) =>
      gooeyToast(title, { showProgress: true, ...options }),
    promise: <T,>(promise: Promise<T>, data: GooeyPromiseData<T>) =>
      gooeyToast.promise(promise, data),
    dismiss: gooeyToast.dismiss,
    update: gooeyToast.update,
  }
);

export { gooeyToast };
