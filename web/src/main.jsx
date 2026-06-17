import React from 'react';
import { createRoot } from 'react-dom/client';
import SofortSkizze from './SofortSkizze.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <SofortSkizze />
  </React.StrictMode>,
);
