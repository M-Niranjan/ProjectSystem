import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'

// Seamless URL migration: If user opens a direct pathname URL without hash (e.g. /step-verification),
// seamlessly migrate to hash route (/#/step-verification) before mounting so Android WebView and browsers load reliably on reload
if (typeof window !== 'undefined') {
  const { pathname, search, hash } = window.location;
  if (pathname && pathname !== '/' && pathname !== '/index.html' && (!hash || hash === '#/')) {
    window.location.replace(`/#${pathname}${search}`);
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)

