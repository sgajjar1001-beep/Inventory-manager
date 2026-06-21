declare module 'react';
declare module 'react-dom/client';
declare module 'react/jsx-runtime';
declare module '*.css';

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
