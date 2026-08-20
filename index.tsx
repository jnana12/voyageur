import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// --- TomTom Canvas Readback Optimization Patch ---
const originalGetContext = HTMLCanvasElement.prototype.getContext;
// @ts-ignore
HTMLCanvasElement.prototype.getContext = function (type, options) {
  if (type === '2d') {
    options = { ...options, willReadFrequently: true };
  }
  return originalGetContext.call(this, type, options);
};
// --------------------------------------------------


const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
