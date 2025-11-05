import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import Sequences from './pages/Sequences.jsx'
import CreateSequence from './pages/CreateSequence.jsx'
import SequenceDetail from './pages/SequenceDetail.jsx'
import TriggerPatterns from './pages/TriggerPatterns.jsx'
import TicketDashboard from './pages/TicketDashboard.jsx'
import TechTicketDetail from './pages/TechTicketDetail.jsx'
import PublicTicket from './pages/PublicTicket.jsx'
import CreateTicket from './pages/CreateTicket.jsx'
import Vans from './pages/Vans.jsx'
import Owners from './pages/Owners.jsx'
import Users from './pages/Users.jsx'
import { AuthProvider, useAuth } from './hooks/useAuth.jsx'
import { ToastProvider } from './hooks/useToast.jsx'

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
        <ToastProvider>
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
              path="/tickets"
              element={
                <ProtectedRoute requireManager={true}>
                  <TicketDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tickets/new"
              element={
                <ProtectedRoute requireManager={true}>
                  <CreateTicket />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tickets/:uuid"
              element={
                <ProtectedRoute requireManager={true}>
                  <TechTicketDetail />
                </ProtectedRoute>
              }
            />
            {/* Public ticket view - no authentication required */}
            <Route
              path="/ticket/:uuid"
              element={<PublicTicket />}
            />
            <Route
              path="/vans"
              element={
                <ProtectedRoute requireViewer={true}>
                  <Vans />
                </ProtectedRoute>
              }
            />
            <Route
              path="/owners"
              element={
                <ProtectedRoute requireViewer={true}>
                  <Owners />
                </ProtectedRoute>
              }
            />
            <Route
              path="/users"
              element={
                <ProtectedRoute requireManager={true}>
                  <Users />
                </ProtectedRoute>
              }
            />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
