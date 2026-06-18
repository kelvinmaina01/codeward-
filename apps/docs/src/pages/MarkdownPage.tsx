import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import ReactMarkdown from 'react-markdown';

import remarkGfm from 'remark-gfm';

// Load all markdown files dynamically as raw text strings
const markdownFiles = import.meta.glob('../**/*.md', { query: '?raw', import: 'default' });

export default function MarkdownPage() {
  const location = useLocation();
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadContent() {
      setLoading(true);
      
      // Determine the file path based on the URL
      // If the URL is /guide/welcome, we look for ../guide/welcome.md
      // We strip the leading slash
      const currentPath = location.pathname.replace(/^\//, '');
      const potentialPath = `../${currentPath}.md`;

      const loader = markdownFiles[potentialPath] as (() => Promise<string>) | undefined;
      
      if (loader) {
        try {
          const rawMd = await loader();
          // Remove VitePress frontmatter if it exists
          const cleanedMd = rawMd.replace(/^---\n[\s\S]*?\n---\n/, '');
          setContent(cleanedMd);
        } catch (error) {
          console.error("Failed to load markdown", error);
          setContent("# Error loading page");
        }
      } else {
        setContent("# 404 - Page Not Found");
      }
      setLoading(false);
    }

    loadContent();
  }, [location.pathname]);

  if (loading) {
    return <div className="text-cw-txt2 animate-pulse">Loading content...</div>;
  }

  return (
    <div className="prose prose-invert prose-cw max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content || ''}</ReactMarkdown>
    </div>
  );
}
