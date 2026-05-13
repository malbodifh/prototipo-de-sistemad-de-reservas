import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'

const HomePage        = lazy(() => import('./pages/HomePage'))
const TablesPage      = lazy(() => import('./pages/TablesPage'))
const ReservationPage = lazy(() => import('./pages/ReservationPage'))
const ConfirmationPage = lazy(() => import('./pages/ConfirmationPage'))
const AdminLogin      = lazy(() => import('./pages/AdminLogin'))
const AdminDashboard  = lazy(() => import('./pages/AdminDashboard'))

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/mesas" element={<TablesPage />} />
            <Route path="/reservar/:tableId" element={<ReservationPage />} />
            <Route path="/confirmacion" element={<ConfirmationPage />} />
          </Route>
          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
