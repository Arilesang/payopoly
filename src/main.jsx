import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './gameshow.css'
import App from './App.jsx'

async function renderApp() {
  if (import.meta.env.MODE === 'demo') {
    const { bootDemo } = await import('./demo/bootstrap');
    bootDemo();
  }
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
renderApp();
