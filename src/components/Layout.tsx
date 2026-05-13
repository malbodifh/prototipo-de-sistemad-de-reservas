import { Outlet, Link, useLocation } from 'react-router-dom'
import { UtensilsCrossed } from 'lucide-react'

export default function Layout() {
  const location = useLocation()
  const isHome = location.pathname === '/'

  return (
    <div className="min-h-screen flex flex-col">
      <header className={`${isHome ? 'absolute top-0 left-0 right-0 z-10' : 'bg-white border-b border-gray-100 shadow-sm'}`}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className={`p-1.5 rounded-lg ${isHome ? 'bg-white/20' : 'bg-brand-500'}`}>
              <UtensilsCrossed className={`w-5 h-5 ${isHome ? 'text-white' : 'text-white'}`} />
            </div>
            <span className={`text-xl font-bold tracking-tight ${isHome ? 'text-white' : 'text-gray-900'}`}>
              Mesa<span className={isHome ? 'text-brand-300' : 'text-brand-500'}>Ya</span>
            </span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link
              to="/admin"
              className={`text-sm font-medium transition-colors ${
                isHome
                  ? 'text-white/80 hover:text-white'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Admin
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-gray-100 py-8 mt-16">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-gray-400">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="w-4 h-4 text-brand-400" />
            <span>MesaYa © 2024</span>
          </div>
          <span>Reserva tu mesa en segundos</span>
        </div>
      </footer>
    </div>
  )
}
