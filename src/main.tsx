import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
// Inter, self-hosted. Latin subset only: the store has no Cyrillic/Greek copy, so there is
// no reason to make shoppers download those glyphs.
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-700.css';
import '@fontsource/inter/latin-800.css';
import { AppProviders } from './app/AppProviders';
import { AppRoutes } from './app/AppRoutes';
import { routerFuture } from './app/routerFuture';

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root not found');

createRoot(container).render(
  <StrictMode>
    <AppProviders>
      {/* BASE_URL is "/" locally and "/littlefish-e-store/" on GitHub Pages (set by --base at build time). */}
      <BrowserRouter basename={import.meta.env.BASE_URL} future={routerFuture}>
        <AppRoutes />
      </BrowserRouter>
    </AppProviders>
  </StrictMode>,
);
