import { Routes, Route } from 'react-router';
import DocsLayout from './components/DocsLayout';
import HomePage from './pages/HomePage';
import MarkdownPage from './pages/MarkdownPage';
import IntegrationsPage from './pages/IntegrationsPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<DocsLayout />}>
        <Route index element={<HomePage />} />
        <Route path="integrations" element={<IntegrationsPage />} />
        <Route path="integrations/:id" element={<IntegrationsPage />} />
        <Route path="*" element={<MarkdownPage />} />
      </Route>
    </Routes>
  );
}
