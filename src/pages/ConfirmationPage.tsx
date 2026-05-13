import { useLocation, useNavigate } from 'react-router-dom'
import { CheckCircle, Calendar, Clock, Users, MapPin, Copy, Home } from 'lucide-react'
import type { Reservation, Table } from '../types/database'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { useState } from 'react'

interface LocationState {
  reservation: Reservation
  table: Table
  date: string
  time: string
  guests: number
}

export default function ConfirmationPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state as LocationState | null
  const [copied, setCopied] = useState(false)

  if (!state) {
    navigate('/')
    return null
  }

  const { reservation, table, date, time, guests } = state

  const formattedDate = format(parseISO(date), "EEEE d 'de' MMMM yyyy", { locale: es })

  function copyCode() {
    navigator.clipboard.writeText(reservation.confirmation_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="max-w-lg mx-auto px-6 py-16">
      {/* Success icon */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-10 h-10 text-emerald-500" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">¡Reserva confirmada!</h1>
        <p className="text-gray-500">
          Hola <strong>{reservation.guest_name.split(' ')[0]}</strong>, tu mesa está lista.
        </p>
      </div>

      {/* Confirmation code */}
      <div className="bg-brand-50 border-2 border-brand-200 rounded-2xl p-6 text-center mb-6">
        <p className="text-sm font-semibold text-brand-600 uppercase tracking-widest mb-2">
          Código de confirmación
        </p>
        <div className="flex items-center justify-center gap-3">
          <span className="text-4xl font-bold font-mono tracking-widest text-brand-700">
            {reservation.confirmation_code}
          </span>
          <button
            onClick={copyCode}
            className="p-2 rounded-lg hover:bg-brand-100 transition-colors text-brand-500"
            title="Copiar código"
          >
            {copied ? (
              <CheckCircle className="w-5 h-5 text-emerald-500" />
            ) : (
              <Copy className="w-5 h-5" />
            )}
          </button>
        </div>
        <p className="text-xs text-brand-500 mt-2">Guarda este código para gestionar tu reserva</p>
      </div>

      {/* Details */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4 mb-6">
        <h2 className="font-semibold text-gray-900 text-lg">Detalles de tu reserva</h2>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-start gap-2.5">
            <Calendar className="w-4 h-4 text-brand-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-gray-500 text-xs mb-0.5">Fecha</p>
              <p className="font-medium text-gray-800 capitalize">{formattedDate}</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Clock className="w-4 h-4 text-brand-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-gray-500 text-xs mb-0.5">Hora</p>
              <p className="font-medium text-gray-800">{time}</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Users className="w-4 h-4 text-brand-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-gray-500 text-xs mb-0.5">Personas</p>
              <p className="font-medium text-gray-800">
                {guests} {guests === 1 ? 'persona' : 'personas'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <MapPin className="w-4 h-4 text-brand-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-gray-500 text-xs mb-0.5">Mesa</p>
              <p className="font-medium text-gray-800">
                {table.name} · {table.zone}
              </p>
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-gray-100">
          <p className="text-sm text-gray-500">
            Confirmación enviada a <strong>{reservation.guest_email}</strong>
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => navigate('/')}
          className="flex-1 flex items-center justify-center gap-2 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 font-medium py-3 rounded-xl transition-colors"
        >
          <Home className="w-4 h-4" />
          Inicio
        </button>
        <button
          onClick={copyCode}
          className="flex-1 flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-medium py-3 rounded-xl transition-colors"
        >
          <Copy className="w-4 h-4" />
          {copied ? '¡Copiado!' : 'Copiar código'}
        </button>
      </div>
    </div>
  )
}
