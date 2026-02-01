
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// Removemos a importação do index.css daqui para 
// garantir que apenas o App.css controle o visual.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)