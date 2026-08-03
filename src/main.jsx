import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { applyBrandFavicon } from './lib/brandLogo.js'

/* Aplica favicon de marca al cargar la app */
applyBrandFavicon()

/* Quita datos viejos de votante del localStorage */
localStorage.removeItem('voterCedula')
localStorage.removeItem('voterName')

/* Monta la aplicacion React con enrutador */
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
