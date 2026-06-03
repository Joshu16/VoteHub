import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { applyBrandFavicon } from './lib/brandLogo.js'

applyBrandFavicon()

/* Quita datos viejos de votante del  local */
localStorage.removeItem('voterCedula')
localStorage.removeItem('voterName')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
