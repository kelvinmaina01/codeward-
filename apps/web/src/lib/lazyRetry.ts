import { lazy, ComponentType } from 'react';

/**
 * Retries dynamic imports when a chunk fails to load due to deployment cache busting.
 * If retries are exhausted, triggers a one-time page reload to fetch the latest deployment assets.
 */
export function lazyRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  retries = 2,
  interval = 1000
) {
  return lazy(() =>
    new Promise<{ default: T }>((resolve, reject) => {
      const attempt = (remaining: number) => {
        factory()
          .then(resolve)
          .catch((error) => {
            if (remaining <= 0) {
              const lastReload = sessionStorage.getItem('codeward_chunk_reload');
              const now = Date.now();
              if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
                sessionStorage.setItem('codeward_chunk_reload', now.toString());
                window.location.reload();
                return;
              }
              reject(error);
              return;
            }
            setTimeout(() => attempt(remaining - 1), interval);
          });
      };
      attempt(retries);
    })
  );
}
