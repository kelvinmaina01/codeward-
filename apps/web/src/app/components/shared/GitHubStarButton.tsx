import React, { useEffect, useState } from 'react';

const REPO = 'kelvinmaina01/codeward-';
const CACHE_KEY = 'codeward_gh_stars';
const CACHE_TTL = 5 * 60 * 1000; // 5 min cache to prevent hitting GitHub unauthenticated rate limit

function formatStars(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(n);
}

interface GitHubStarButtonProps {
  variant?: 'dashboard' | 'header' | 'sidebar' | 'hero';
  className?: string;
}

export const GitHubStarButton: React.FC<GitHubStarButtonProps> = ({ variant = 'dashboard', className = '' }) => {
  const [stars, setStars] = useState<number | null>(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { count, ts } = JSON.parse(cached);
        if (Date.now() - ts < CACHE_TTL) {
          return count;
        }
      }
    } catch {}
    return null;
  });

  useEffect(() => {
    // If we already have fresh cached stars from init, avoid refetching
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { count, ts } = JSON.parse(cached);
        if (Date.now() - ts < CACHE_TTL) {
          setStars(count);
          return;
        }
      }
    } catch {}

    fetch(`https://api.github.com/repos/${REPO}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch repo stars');
        return res.json();
      })
      .then(data => {
        const count = typeof data.stargazers_count === 'number' ? data.stargazers_count : 0;
        setStars(count);
        localStorage.setItem(CACHE_KEY, JSON.stringify({ count, ts: Date.now() }));
      })
      .catch(() => {
        // Fallback gracefully if offline or rate limited
        if (stars === null) setStars(null);
      });
  }, []);

  // Dashboard top-bar variant (pixel-perfect match with Global feed, Skills, Docs, Need help)
  if (variant === 'dashboard') {
    return (
      <a
        href={`https://github.com/${REPO}`}
        target="_blank"
        rel="noopener noreferrer"
        title="Star Codeward on GitHub"
        aria-label="Star Codeward on GitHub"
        className={`group hidden sm:flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-md border border-cw-bdr bg-cw-bg2 hover:bg-cw-bg3 hover:border-cw-bdr2 text-cw-txt text-[12px] sm:text-[13px] font-medium transition-all duration-150 whitespace-nowrap shrink-0 no-underline shadow-xs ${className}`}
      >
        {/* GitHub Monomark */}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="text-cw-txt group-hover:text-white transition-colors shrink-0"
          aria-hidden="true"
        >
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
        </svg>

        <span className="font-medium text-cw-txt group-hover:text-white transition-colors">
          Star
        </span>

        {/* Counter Badge */}
        <span className="flex items-center gap-1 text-[11px] bg-cw-bg px-1.5 py-0.5 rounded border border-cw-bdr text-cw-txt2 font-mono group-hover:border-amber-400/40 group-hover:text-cw-txt transition-all">
          <svg
            className="w-3 h-3 text-amber-400 fill-amber-400 group-hover:scale-110 transition-transform"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          <span>{stars !== null ? formatStars(stars) : '--'}</span>
        </span>
      </a>
    );
  }

  // Hero variant (large, glassmorphic pill for hero sections)
  if (variant === 'hero') {
    return (
      <a
        href={`https://github.com/${REPO}`}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full border border-white/20 bg-white/5 backdrop-blur-sm text-white/80 hover:text-white hover:border-white/40 hover:bg-white/10 transition-all text-sm font-semibold group ${className}`}
        aria-label="Star Codeward on GitHub"
      >
        <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
        </svg>
        <span>Star on GitHub</span>
        {stars !== null && (
          <>
            <span className="w-px h-3.5 bg-white/20" />
            <span className="flex items-center gap-1 text-yellow-400 font-bold">
              <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
              </svg>
              {formatStars(stars)}
            </span>
          </>
        )}
      </a>
    );
  }

  // Sidebar variant
  if (variant === 'sidebar') {
    return (
      <a
        href={`https://github.com/${REPO}`}
        target="_blank"
        rel="noopener noreferrer"
        className={`flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm font-semibold group ${className}`}
        aria-label="Star Codeward on GitHub"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
        </svg>
        <span>Star on GitHub</span>
        {stars !== null && (
          <span className="ml-1 text-yellow-400 font-bold flex items-center gap-0.5">
            <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
            </svg>
            {formatStars(stars)}
          </span>
        )}
      </a>
    );
  }

  // Header variant (marketing navbar)
  return (
    <a
      href={`https://github.com/${REPO}`}
      target="_blank"
      rel="noopener noreferrer"
      className={`hidden md:inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/15 bg-white/5 text-white/70 hover:text-white hover:border-white/30 transition-all text-sm font-semibold ${className}`}
      aria-label="Star Codeward on GitHub"
    >
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
      </svg>
      {stars !== null ? (
        <>
          <svg className="w-3 h-3 text-yellow-400 fill-current" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
          </svg>
          <span className="text-yellow-400 font-bold">{formatStars(stars)}</span>
        </>
      ) : 'GitHub'}
    </a>
  );
};
