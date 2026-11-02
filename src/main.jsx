import React from 'react'
import ReactDOM from 'react-dom/client'
import { LanguageProvider } from './context/LanguageContext'
import App from './App'
import './styles/global.css'
import './styles/layout.css'
import './styles/pages.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </React.StrictMode>
)
