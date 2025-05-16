import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from "react-router-dom"; // Routes and Route are no longer needed here
import App from './App.tsx'
// ReportPage import is no longer needed here as App.tsx will handle it
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App /> {/* App component now handles all routing */}
    </BrowserRouter>
  </React.StrictMode>,
)
