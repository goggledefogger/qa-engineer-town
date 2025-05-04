import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from './App.tsx'
import ReportPage from './pages/ReportPage.tsx'; // Import the new page
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/report/:reportId" element={<ReportPage />} />
        {/* TODO: Add a 404 Not Found route */}
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
