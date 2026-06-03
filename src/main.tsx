import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

import './styles/tokens.css';
import './styles/base.css';
import './styles/backdrop.css';
import './styles/effects.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/widgets.css';
import './styles/upload.css';
import './styles/views.css';
import './styles/notifications.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
