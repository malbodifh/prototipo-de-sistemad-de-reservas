import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  UtensilsCrossed,
  LogOut,
  Calendar,
  Users,
  Clock,
  Lock,
  Unlock,
  RefreshCw,
} from 'lucide-react'
import { supabase } from '../lib/supabase'

const ADMIN_SECRET = import.meta.env.VITE_ADMIN_SECRET as string
import type { Reservation, Table } from '../types/database'
import { TIME_SLOTS } from '../lib/constants'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default function AdminDashboard() {
  const navigate = useNavigate()

  useEffect(() => {
    if (!sessionStorage.getItem('mesaya_admin')) navigate('/admin')
  }, [navigate])

  const today = format(new Date(), 'yyyy-MM-dd')
  const [selectedDate, setSelectedDate] = useState(today)
  const [tables, setTables] = useState<Table[]>([])
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'schedule' | 'list'>('schedule')

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [tablesRes, reservationsRes] = await Promise.all([
      supabase.from('tables').select('*').order('name'),
      supabase
        .from('reservations')
        .select('*, table:tables(*)')
        .eq('date', selectedDate)
        .order('time_slot'),
    ])
    if (tablesRes.data) setTables(tablesRes.data as Table[])
    if (reservationsRes.data) setReservations(reservationsRes.data as Reservation[])
    setLoading(false)
  }, [selectedDate])

  useEffect(() => {
    fetchData()

    const channel = supabase
      .channel('admin-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tables' }, fetchData)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchData])

  async function toggleTableLock(table: Table) {
    await supabase.functions.invoke('admin-action', {
      body: { action: 'toggle-lock', tableId: table.id },
      headers: { 'x-admin-secret': ADMIN_SECRET },
    })
  }

  async function cancelReservation(id: string) {
    await supabase.functions.invoke('admin-action', {
      body: { action: 'cancel-reservation', reservationId: id },
      headers: { 'x-admin-secret': ADMIN_SECRET },
    })
  }

  function logout() {
    sessionStorage.removeItem('mesaya_admin')
    navigate('/admin')
  }

  // Build grid: time slots × tables
  function getCellReservation(tableId: string, timeSlot: string) {
    return reservations.find(
      r => r.table_id === tableId && r.time_slot === timeSlot && r.status !== 'cancelled'
    )
  }

  const stats = {
    total: reservations.filter(r => r.status !== 'cancelled').length,
    cancelled: reservations.filter(r => r.status === 'cancelled').length,
    guests: reservations
      .filter(r => r.status !== 'cancelled')
      .reduce((sum, r) => sum + r.party_size, 0),
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-brand-500 rounded-lg">
              <UtensilsCrossed className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900">
              Mesa<span className="text-brand-500">Ya</span>
              <span className="text-gray-400 font-normal ml-2 text-sm">Admin</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              title="Actualizar"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Salir
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Date picker + stats */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-brand-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white"
            />
            <span className="text-sm text-gray-500 capitalize hidden sm:block">
              {format(new Date(selectedDate + 'T00:00:00'), "EEEE d 'de' MMMM", { locale: es })}
            </span>
          </div>

          <div className="flex gap-3">
            {[
              { label: 'Reservas', value: stats.total, color: 'text-emerald-500' },
              { label: 'Comensales', value: stats.guests, color: 'text-blue-500' },
              { label: 'Canceladas', value: stats.cancelled, color: 'text-red-400' },
            ].map(s => (
              <div key={s.label} className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-center min-w-[80px]">
                <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-gray-400">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit mb-6">
          {(['schedule', 'list'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'schedule' ? 'Horario del día' : 'Lista de reservas'}
            </button>
          ))}
        </div>

        {activeTab === 'schedule' && (
          <ScheduleGrid
            tables={tables}
            timeSlots={TIME_SLOTS.map(s => s.time)}
            getCellReservation={getCellReservation}
            onToggleLock={toggleTableLock}
          />
        )}

        {activeTab === 'list' && (
          <ReservationsList
            reservations={reservations}
            onCancel={cancelReservation}
          />
        )}
      </div>
    </div>
  )
}

// ── Schedule Grid ──────────────────────────────────────────────────────────────

interface ScheduleGridProps {
  tables: Table[]
  timeSlots: string[]
  getCellReservation: (tableId: string, time: string) => Reservation | undefined
  onToggleLock: (table: Table) => void
}

function ScheduleGrid({ tables, timeSlots, getCellReservation, onToggleLock }: ScheduleGridProps) {
  const zoneColors: Record<string, string> = {
    'Terraza': 'bg-sky-50 text-sky-700 border-sky-200',
    'Salón Principal': 'bg-violet-50 text-violet-700 border-violet-200',
    'Barra': 'bg-amber-50 text-amber-700 border-amber-200',
    'Privado': 'bg-rose-50 text-rose-700 border-rose-200',
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 font-medium text-gray-500 w-24 sticky left-0 bg-gray-50">
                Hora
              </th>
              {tables.map(t => (
                <th key={t.id} className="px-3 py-3 text-center min-w-[120px]">
                  <div className="font-semibold text-gray-900 text-xs">{t.name}</div>
                  <div className={`text-xs px-2 py-0.5 rounded-full border mt-1 inline-block ${zoneColors[t.zone] ?? 'bg-gray-100 text-gray-500'}`}>
                    {t.zone}
                  </div>
                  <button
                    onClick={() => onToggleLock(t)}
                    title={t.status === 'blocked' ? 'Desbloquear' : 'Bloquear'}
                    className={`mt-1 flex items-center gap-1 mx-auto text-xs px-2 py-0.5 rounded-full transition-colors ${
                      t.status === 'blocked'
                        ? 'bg-amber-100 text-amber-600 hover:bg-amber-200'
                        : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                    }`}
                  >
                    {t.status === 'blocked' ? (
                      <><Lock className="w-3 h-3" /> Bloqueada</>
                    ) : (
                      <><Unlock className="w-3 h-3" /> Libre</>
                    )}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timeSlots.map((slot, i) => (
              <tr key={slot} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-500 sticky left-0 bg-inherit border-r border-gray-100">
                  {slot}
                </td>
                {tables.map(t => {
                  const res = getCellReservation(t.id, slot)
                  return (
                    <td key={t.id} className="px-2 py-2 text-center">
                      {res ? (
                        <div className="bg-brand-50 border border-brand-200 rounded-lg px-2 py-1.5 text-left">
                          <div className="font-semibold text-brand-800 text-xs truncate max-w-[100px]">
                            {res.guest_name.split(' ')[0]}
                          </div>
                          <div className="text-brand-500 text-xs flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {res.party_size}
                          </div>
                        </div>
                      ) : (
                        <div className="h-10 rounded-lg bg-gray-100/50 border border-dashed border-gray-200" />
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Reservations List ──────────────────────────────────────────────────────────

interface ReservationsListProps {
  reservations: Reservation[]
  onCancel: (id: string) => void
}

function ReservationsList({ reservations, onCancel }: ReservationsListProps) {
  if (reservations.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p>No hay reservas para este día</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {reservations.map(r => (
        <div
          key={r.id}
          className={`bg-white border rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-opacity ${
            r.status === 'cancelled' ? 'opacity-50 border-gray-100' : 'border-gray-200'
          }`}
        >
          <div className="flex items-start gap-4">
            <div className={`w-2 h-full min-h-[40px] rounded-full ${r.status === 'confirmed' ? 'bg-emerald-400' : 'bg-red-300'}`} />
            <div>
              <div className="font-semibold text-gray-900">{r.guest_name}</div>
              <div className="text-sm text-gray-500 mt-0.5">{r.guest_email} · {r.guest_phone}</div>
              <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {r.time_slot}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" /> {r.party_size} personas
                </span>
                {r.table && (
                  <span className="flex items-center gap-1">
                    🍽 {(r.table as unknown as Table).name} · {(r.table as unknown as Table).zone}
                  </span>
                )}
                <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-600">
                  {r.confirmation_code}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`text-xs font-semibold px-3 py-1 rounded-full ${
                r.status === 'confirmed'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-red-100 text-red-600'
              }`}
            >
              {r.status === 'confirmed' ? 'Confirmada' : 'Cancelada'}
            </span>
            {r.status === 'confirmed' && (
              <button
                onClick={() => onCancel(r.id)}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors px-2 py-1 rounded-lg hover:bg-red-50"
              >
                Cancelar
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
