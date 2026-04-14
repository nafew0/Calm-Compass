import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { SiteThemeProvider } from './contexts/SiteThemeContext'
import { ToastProvider } from './hooks/useToast'
import AdminRoute from './components/AdminRoute'
import ProtectedRoute from './components/ProtectedRoute'
import Navbar from './components/Navbar'

const Home = lazy(() => import('./pages/Home'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const PaymentSuccess = lazy(() => import('./pages/PaymentSuccess'))
const PaymentFailed = lazy(() => import('./pages/PaymentFailed'))
const Pricing = lazy(() => import('./pages/Pricing'))
const Setup = lazy(() => import('./pages/Setup'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Profile = lazy(() => import('./pages/Profile'))
const DecoderHome = lazy(() => import('./pages/decoder/DecoderHome'))
const DecoderCategory = lazy(() => import('./pages/decoder/DecoderCategory'))
const DecoderBehavior = lazy(() => import('./pages/decoder/DecoderBehavior'))
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'))
const AdminUserDetail = lazy(() => import('./pages/admin/AdminUserDetail'))
const AdminPayments = lazy(() => import('./pages/admin/AdminPayments'))
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'))

function AppFallback() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
      <div className="rounded-2xl bg-card px-5 py-4 text-sm font-medium text-muted-foreground">
        Loading...
      </div>
    </div>
  )
}

function App() {
  const location = useLocation()
  const hideNavbar =
    location.pathname === '/reset-password' ||
    location.pathname === '/forgot-password'

  return (
    <AuthProvider>
      <SiteThemeProvider>
        <ToastProvider>
          <div className="min-h-screen bg-background">
            {hideNavbar ? null : <Navbar />}
            <main className={hideNavbar ? undefined : 'pt-16'}>
              <Suspense fallback={<AppFallback />}>
                <Routes>
                  {/* Public routes */}
                  <Route path="/" element={<Home />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/verify-email" element={<VerifyEmail />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/payment/success" element={<PaymentSuccess />} />
                  <Route path="/payment/failed" element={<PaymentFailed />} />
                  <Route path="/pricing" element={<Pricing />} />

                  {/* Protected routes */}
                  <Route
                    path="/setup"
                    element={
                      <ProtectedRoute allowIncompleteSetup>
                        <Setup />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/decoder"
                    element={
                      <ProtectedRoute>
                        <DecoderHome />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/decoder/behavior/:slug"
                    element={
                      <ProtectedRoute>
                        <DecoderBehavior />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/decoder/:categorySlug"
                    element={
                      <ProtectedRoute>
                        <DecoderCategory />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute>
                        <Dashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/profile"
                    element={
                      <ProtectedRoute>
                        <Profile />
                      </ProtectedRoute>
                    }
                  />

                  {/* Admin routes */}
                  <Route
                    path="/admin"
                    element={
                      <AdminRoute>
                        <AdminLayout />
                      </AdminRoute>
                    }
                  >
                    <Route index element={<AdminDashboard />} />
                    <Route path="users" element={<AdminUsers />} />
                    <Route path="users/:userId" element={<AdminUserDetail />} />
                    <Route path="payments" element={<AdminPayments />} />
                    <Route path="settings" element={<AdminSettings />} />
                  </Route>

                  {/* Catch all */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </main>
          </div>
        </ToastProvider>
      </SiteThemeProvider>
    </AuthProvider>
  )
}

export default App
