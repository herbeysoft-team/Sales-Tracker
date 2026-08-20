import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'

import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Customers from './pages/Customers'
import CustomerDetail from './pages/CustomerDetail'
import NewCustomer from './pages/NewCustomer'
import Sales from './pages/Sales'
import NewSale from './pages/NewSale'
import EditSale from './pages/EditSale'
import NewPayment from './pages/NewPayment'
import Marketers from './pages/Marketers'
import MarketerDetail from './pages/MarketerDetail'
import NewUser from './pages/NewUser'
import Profile from './pages/Profile'
import Reports from './pages/Reports'
import AuditTrail from './pages/AuditTrail'

function Protected({ children, adminOnly }) {
  return (
    <ProtectedRoute adminOnly={adminOnly}>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />

          <Route path="/customers" element={<Protected><Customers /></Protected>} />
          <Route path="/customers/new" element={<Protected><NewCustomer /></Protected>} />
          <Route path="/customers/:id" element={<Protected><CustomerDetail /></Protected>} />

          <Route path="/sales" element={<Protected><Sales /></Protected>} />
          <Route path="/sales/new" element={<Protected><NewSale /></Protected>} />
          <Route path="/sales/:id/edit" element={<Protected adminOnly><EditSale /></Protected>} />
          <Route path="/payments/new" element={<Protected><NewPayment /></Protected>} />

          <Route path="/profile" element={<Protected><Profile /></Protected>} />
          <Route path="/reports" element={<Protected><Reports /></Protected>} />

          <Route path="/marketers" element={<Protected adminOnly><Marketers /></Protected>} />
          <Route path="/marketers/new" element={<Protected adminOnly><NewUser /></Protected>} />
          <Route path="/marketers/:id" element={<Protected adminOnly><MarketerDetail /></Protected>} />
          <Route path="/audit-trail" element={<Protected adminOnly><AuditTrail /></Protected>} />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
