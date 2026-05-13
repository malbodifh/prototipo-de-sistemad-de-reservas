import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Clock, Users, MapPin, AlertTriangle, CheckCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Table } from '../types/database'
import { BLOCK_DURATION_MS } from '../lib/constants'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

const SESSION_KEY = 'mesaya_session_id'

function getSessionId(): string {
  let id = sessionStorage.getItem(SESSION_KEY)
  if (!id) {
    id = crypto.randomUUID()
    sessionStorage.setItem(SESSION_KEY, id)
  }
  return id
}

export default function ReservationPage() {
  const { tableId } = useParams<{ tableId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const date = searchParams.get('date') ?? ''
  const time = searchParams.get('time') ?? ''
  const guests = Number(searchParams.get('guests') ?? 2)

  const [table, setTable] = useState<Table | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const [countdown, setCountdown] = useState(BLOCK_DURATION_MS / 1000)
  const [expired, setExpired] = useState(false)
  const [blockError, setBlockError] = useState<string | null>(null)

  const sessionId = getSessionId()
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const expiryRef = useRef<number>(0)
  const submittedRef = useRef(false)

  const [form, setForm] = useState({ name: '', email: '', phone: '' })

  const releaseBlock = useCallback(async () => {
    if (!tableId) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).rpc('release_block', {
      p_table_id: tableId,
      p_session_id: sessionId,
    })
  }, [tableId, sessionId])

  useEffect(() => {
    if (!tableId) return

    async function blockTable() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc('block_table', {
        p_table_id: tableId!,
        p_session_id: sessionId,
      })

      if (error || data?.error) {
        setBlockError(data?.error ?? 'No se pudo bloquear la mesa')
        setLoading(false)
        return
      }

      setTable(data.table as Table)
      setBlocked(true)
      expiryRef.current = new Date(data.blockedUntil).getTime()

      timerRef.current = setInterval(() => {
        const remaining = Math.max(0, expiryRef.current - Date.now())
        setCountdown(Math.ceil(remaining / 1000))
        if (remaining <= 0) {
          clearInterval(timerRef.current!)
          setExpired(true)
          if (!submittedRef.current) releaseBlock()
        }
      }, 500)

      setLoading(false)
    }

    blockTable()

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [tableId, sessionId, releaseBlock])

  useEffect(() => {
    return () => {
      if (blocked && !submittedRef.current) releaseBlock()
    }
  }, [blocked, releaseBlock])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (expired || !table) return
    setSubmitting(true)

    if (timerRef.current) clearInterval(timerRef.current)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc('create_reservation', {
      p_table_id:    table.id,
      p_session_id:  sessionId,
      p_guest_name:  form.name,
      p_guest_email: form.email,
      p_guest_phone: form.phone,
      p_party_size:  guests,
      p_date:        date,
      p_time_slot:   time,
    })

    if (error || data?.error) {
      setSubmitting(false)
      setBlockError(data?.error ?? 'Error al crear la reserva. Intenta de nuevo.')
      return
    }

    submittedRef.current = true

    navigate('/confirmacion', {
      state: { reservation: data.reservation, table, date, time, guests },
    })
  }

  const formattedDate = date
    ? format(parseISO(date), "EEEE d 'de' MMMM yyyy", { locale: es })
    : ''

  const countdownColor =
    countdown > 60 ? 'text-emerald-600' : countdown > 30 ? 'text-amber-500' : 'text-red-500'

  const mins = Math.floor(countdown / 60)
  const secs = countdown % 60

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (blockError) {
    return (
      <div className="max-w-md mx-auto px-6 py-20 text-center">
        <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Mesa no disponible</h2>
        <p className="text-gray-500 mb-6">{blockError}</p>
        <button
          onClick={() => navigate(`/mesas?date=${date}&time=${time}&guests=${guests}`)}
          className="bg-brand-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-brand-600 transition-colors"
        >
          Ver otras mesas
        </button>
      </div>
    )
  }

  if (expired) {
    return (
      <div className="max-w-md mx-auto px-6 py-20 text-center">
        <Clock className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Tiempo agotado</h2>
        <p className="text-gray-500 mb-6">
          Los 3 minutos de reserva expiraron. La mesa quedó liberada.
        </p>
        <button
          onClick={() => navigate(`/mesas?date=${date}&time=${time}&guests=${guests}`)}
          className="bg-brand-500 text-white px-6 py-3 rounded-xl font-semibond hover:bg-brand-600 transition-colors"
        >
          Elegir otra mesa
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div
        className={`mb-6 flex items-center gap-3 px-5 py-4 rounded-2xl border-2 ${
          countdown > 60
            ? 'border-emerald-200 bg-emerald-50'
            : countdown > 30
            ? 'border-amber-200 bg-amber-50'
            : 'border-red-200 bg-red-50'
        }`}
      >
        <Clock className={`w-6 h-6 ${countdownColor} shrink-0`} />
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-700">Mesa bloqueada para ti</p>
          <p className="text-xs text-gray-500">
            Completa tu reserva antes de que expire el tiempo
          </p>
        </div>
        <span className={`text-2xl font-mono font-bold tabular-nums ${countdownColor}`}>
          {mins}:{secs.toString().padStart(2, '0')}
        </span>
      </div>

      {table && (
        <div className="bg-gray-50 rounded-2xl p-5 mb-6 flex flex-wrap gap-4 text-sm text-gray-600">
          <span className="font-semibold text-gray-900 text-base">{table.name}</span>
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-gray-400" />
            {table.zone}
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-gray-400" />
            Capacidad: {table.capacity}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            {formattedDate} · {time}
          </span>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Completa tu reserva</h1>
        <p className="text-gray-500 text-sm mb-6">
          {guests} {guests === 1 ? 'persona' : 'personas'} · {formattedDate}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="guest-name" className="block text-sm font-medium text-gray-700 mb-1.5">
              Nombre completo
            </label>
            <input
              id="guest-name"
              type="text"
              required
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Juan García"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="guest-email" className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <input
              id="guest-email"
              type="email"
              required
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="juan@email.com"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="guest-phone" className="block text-sm font-medium text-gray-700 mb-1.5">Teléfono</label>
            <input
              id="guest-phone"
              type="tel"
              required
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="+34 600 000 000"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-brand-500/20 mt-2"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Confirmando...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Confirmar reserva
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
