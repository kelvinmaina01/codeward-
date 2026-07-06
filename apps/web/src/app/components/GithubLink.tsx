/** Shared GitHub logo + link helpers so every "view on GitHub" spot is consistent and points
 *  users to the EXACT file/line/PR where a finding actually lives. */

export function GithubIcon({ size = 12, className = '' }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} className={className} fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

export function GitlabIcon({ size = 12, className = '' }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="currentColor" aria-hidden="true">
      <path d="M23.955 13.587l-1.342-4.135-2.664-8.189a.455.455 0 00-.867 0L16.418 9.45H7.582L4.919 1.263a.455.455 0 00-.867 0L1.388 9.452.045 13.587a.924.924 0 00.331 1.023L12 23.054l11.624-8.443a.924.924 0 00.331-1.024" />
    </svg>
  );
}

const REPO_RE = /^[\w.-]+\/[\w.-]+$/;

/** Deep-link to a file (optionally a line) on GitHub's default branch. */
export function githubFileUrl(repoFullName: string, file: string, line?: number | null): string {
  const clean = file.replace(/^\.\//, '').replace(/^\/+/, '');
  const base = `https://github.com/${repoFullName}/blob/HEAD/${clean}`;
  return line != null ? `${base}#L${line}` : base;
}

/** A "view on GitHub" link with the octocat logo — the standard CTA across the app. */
export function GithubLink({ href, label, className = '' }: { href: string; label: string; className?: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className={`inline-flex items-center gap-1.5 no-underline ${className}`}>
      <GithubIcon size={13} />
      {label}
      <svg viewBox="0 0 24 24" width={10} height={10} fill="none" stroke="currentColor" strokeWidth={2} className="opacity-60"><path d="M7 17L17 7M17 7H8M17 7v9" /></svg>
    </a>
  );
}

/**
 * Extracts file-like paths from a finding's evidence/description string (e.g.
 * "Files: src/a.tsx, src/b.tsx, ...") so each can be turned into a real deep link to where the
 * finding actually was — exactly the "point me to the specific place" behavior devs want.
 */
export function extractFilePaths(text: string | null | undefined): string[] {
  if (!text) return [];
  const matches = text.match(/[\w][\w./-]*\.[a-zA-Z]{1,6}\b/g) || [];
  return Array.from(new Set(matches.map((m) => m.replace(/^\.\//, '')))).filter((p) => p.includes('.')).slice(0, 60);
}

export function isValidRepoFullName(name: string | undefined | null): boolean {
  return !!name && REPO_RE.test(name);
}
