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
import SequenceSupplies from './pages/SequenceSupplies.jsx'
import ActiveSequences from './pages/ActiveSequences.jsx'
import Vans from './pages/Vans.jsx'
import Owners from './pages/Owners.jsx'
import Users from './pages/Users.jsx'
import { AuthProvider, useAuth } from './hooks/useAuth.jsx'
import { ToastProvider } from './hooks/useToast.jsx'

// Protected Route Component
function ProtectedRoute({ children, requireAdmin = false, requireManager = false, requireTechnician = false }) {
  const { isAuthenticated, authLoading, hasRole, isSiteAdmin } = useAuth();

  if (authLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Site admin bypasses all role checks
  if (isSiteAdmin()) {
    return children;
  }

  // Check role requirements
  if (requireAdmin && !hasRole('admin')) {
    return <Navigate to="/" replace />;
  }

  if (requireManager && !(hasRole('manager') || hasRole('admin'))) {
    return <Navigate to="/" replace />;
  }

  // Technician access: technician, manager, or admin can access
  if (requireTechnician && !(hasRole('technician') || hasRole('manager') || hasRole('admin'))) {
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
                <ProtectedRoute requireTechnician={true}>
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
                <ProtectedRoute requireAdmin={true}>
                  <TriggerPatterns />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tickets"
              element={
                <ProtectedRoute requireTechnician={true}>
                  <TicketDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/active-sequences"
              element={
                <ProtectedRoute requireTechnician={true}>
                  <ActiveSequences />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tickets/new"
              element={
                <ProtectedRoute requireTechnician={true}>
                  <CreateTicket />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tickets/:uuid"
              element={
                <ProtectedRoute requireTechnician={true}>
                  <TechTicketDetail />
                </ProtectedRoute>
              }
            />
            {/* Public ticket view - no authentication required */}
            <Route
              path="/ticket/:uuid"
              element={<PublicTicket />}
            />
            {/* Public supplies view - no authentication required */}
            <Route
              path="/supplies/:sequenceKey"
              element={<SequenceSupplies />}
            />
            <Route
              path="/vans"
              element={
                <ProtectedRoute requireTechnician={true}>
                  <Vans />
                </ProtectedRoute>
              }
            />
            <Route
              path="/owners"
              element={
                <ProtectedRoute requireTechnician={true}>
                  <Owners />
                </ProtectedRoute>
              }
            />
            <Route
              path="/users"
              element={
                <ProtectedRoute requireAdmin={true}>
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
