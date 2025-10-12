import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import UserManagement from './pages/UserManagement.jsx'
import Sequences from './pages/Sequences.jsx'
import CreateSequence from './pages/CreateSequence.jsx'
import SequenceDetail from './pages/SequenceDetail.jsx'
import TriggerPatterns from './pages/TriggerPatterns.jsx'
import { AuthProvider, useAuth } from './hooks/useAuth.jsx'

// Protected Route Component
function ProtectedRoute({ children, requireAdmin = false, requireManager = false, requireViewer = false }) {
  const { isAuthenticated, authLoading, hasRole } = useAuth();

  if (authLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Check role requirements
  if (requireAdmin && !hasRole('admin')) {
    return <Navigate to="/" replace />;
  }

  if (requireManager && !(hasRole('manager') || hasRole('admin'))) {
    return <Navigate to="/" replace />;
  }

  if (requireViewer && !(hasRole('viewer') || hasRole('manager') || hasRole('admin'))) {
    return <Navigate to="/" replace />;
  }

  return children;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<App />} />
          <Route
            path="/sequences"
            element={
              <ProtectedRoute requireViewer={true}>
                <Sequences />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sequences/create"
            element={
              <ProtectedRoute requireManager={true}>
                <CreateSequence />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sequences/:key"
            element={
              <ProtectedRoute requireManager={true}>
                <SequenceDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/patterns"
            element={
              <ProtectedRoute requireManager={true}>
                <TriggerPatterns />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute requireAdmin={true}>
                <UserManagement />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
