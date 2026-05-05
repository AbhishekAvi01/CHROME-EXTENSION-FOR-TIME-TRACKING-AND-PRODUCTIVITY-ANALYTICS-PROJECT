import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import WeeklyReport from './pages/WeeklyReport'
import Settings from './pages/Settings'
import Login from './pages/Login'

const isTokenValid = (token) => token && token !== 'null' && token !== 'undefined';

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return isTokenValid(token) ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="weekly-report" element={<WeeklyReport />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </Router>
  )
}

export default App
