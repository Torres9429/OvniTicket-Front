import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from 'next-themes';
import { Toast } from '@heroui/react';
import '@fontsource-variable/plus-jakarta-sans/wght.css';
import './index.css';
import App from './App.jsx';
import { ProveedorAutenticacion } from './context/ContextoAutenticacion.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider attribute="class" defaultTheme="system">
        <ProveedorAutenticacion>
          <Toast.Provider />
          <App />
        </ProveedorAutenticacion>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
);
