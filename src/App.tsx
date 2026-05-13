import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import TablesPage from './pages/TablesPage'
import ReservationPage from './pages/ReservationPage'
import ConfirmationPage from './pages/ConfirmationPage'
import AdminLogin from './pages/AdminLogin'
import AdminDashboard from './pages/AdminDashboard'

export default function App() {
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  )
}
