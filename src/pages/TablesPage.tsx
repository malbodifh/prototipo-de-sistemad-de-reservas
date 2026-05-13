import { useEffect, useState, useCallback, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Users, Clock, MapPin, Lock, CheckCircle, Filter } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Table } from '../types/database'
import { ZONES } from '../lib/constants'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

export default function TablesPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const date = searchParams.get('date') ?? ''
  const time = searchParams.get('time') ?? ''
  const guests = Number(searchParams.get('guests') ?? 2)

  const [tables, setTables] = useState<Table[]>([])
  const [loading, setLoading] = useState(true)
  const [zoneFilter, setZoneFilter] = useState<string>('Todas')
  const [reservedTableIds, setReservedTableIds] = useState<Set<string>>(new Set())
  const [now, setNow] = useState(Date.now())

  // Only tick when there are blocked tables — avoids full re-render when nothing is blocked
  const hasBlockedTables = useMemo(
    () => tables.some(t => t.status === 'blocked'),
    [tables]
  )

  useEffect(() => {
    if (!hasBlockedTables) return
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [hasBlockedTables])

  const fetchTables = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('tables').select('*').order('name')
    if (data) setTables(data as Table[])
    setLoading(false)
  }, [])

  const fetchReservedIds = useCallback(async () => {
    if (!date || !time) return
    const { data } = await supabase
      .from('reservations')
      .select('table_id')
      .eq('date', date)
      .eq('time_slot', time)
      .neq('status', 'cancelled')
    if (data) setReservedTableIds(new Set(data.map(r => r.table_id)))
  }, [date, time])

  useEffect(() => {
    fetchTables()
    fetchReservedIds()

    const channel = supabase
      .channel('tables-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tables' }, payload => {
        if (payload.eventType === 'UPDATE') {
          setTables(prev =>
            prev.map(t => (t.id === (payload.new as Table).id ? (payload.new as Table) : t))
          )
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reservations' }, () => {
        fetchReservedIds()
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'reservations' }, () => {
        fetchReservedIds()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchTables, fetchReservedIds])

  function getTableState(table: Table): 'available' | 'blocked' | 'reserved' {
    if (reservedTableIds.has(table.id)) return 'reserved'
    if (table.status === 'blocked' && table.blocked_until) {
      if (new Date(table.blocked_until).getTime() > now) return 'blocked'
    }
    return 'available'
  }

  function getCountdown(table: Table): string {
    if (!table.blocked_until) return ''
    const remaining = Math.max(0, new Date(table.blocked_until).getTime() - now)
    const mins = Math.floor(remaining / 60000)
    const secs = Math.floor((remaining % 60000) / 1000)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const filtered = tables.filter(t => t.capacity >= guests && (zoneFilter === 'Todas' || t.zone === zoneFilter))

  const formattedDate = date ? format(parseISO(date), "EEEE d 'de' MMMM", { locale: es }) : ''

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Mesas disponibles</h1>
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
          <span className="flex items-center gap-1.5 bg-gray-100 px-3 py-1.5 rounded-full">
            <Clock className="w-3.5 h-3.5" />
            {formattedDate} · {time}
          </span>
          <span className="flex items-center gap-1.5 bg-gray-100 px-3 py-1.5 rounded-full">
            <Users className="w-3.5 h-3.5" />
            {guests} {guests === 1 ? 'persona' : 'personas'}
          </span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex flex-wrap gap-4 text-sm">
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
            Disponible
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" />
            Bloqueada (3 min)
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-400 inline-block" />
            Reservada
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <div className="flex gap-1">
            {['Todas', ...ZONES].map(z => (
              <button
                key={z}
                onClick={() => setZoneFilter(z)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  zoneFilter === z
                    ? 'bg-brand-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {z}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-44 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">No hay mesas para {guests} personas</p>
          <p className="text-sm mt-1">Prueba con menos personas o cambia la zona</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map(table => {
            const state = getTableState(table)
            return (
              <TableCard
                key={table.id}
                table={table}
                state={state}
                countdown={state === 'blocked' ? getCountdown(table) : ''}
                onSelect={() => navigate(`/reservar/${table.id}?date=${date}&time=${time}&guests=${guests}`)}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

interface TableCardProps {
  table: Table
  state: 'available' | 'blocked' | 'reserved'
  countdown: string
  onSelect: () => void
}

function TableCard({ table, state, countdown, onSelect }: TableCardProps) {
  const isAvailable = state === 'available'
  const isBlocked = state === 'blocked'
  const isReserved = state === 'reserved'

  return (
    <div
      onClick={isAvailable ? onSelect : undefined}
      className={`relative rounded-2xl border-2 p-5 transition-all duration-200 flex flex-col gap-3
        ${isAvailable ? 'border-gray-200 bg-white hover:border-brand-400 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer' : ''}
        ${isBlocked ? 'border-amber-200 bg-amber-50 cursor-not-allowed opacity-80' : ''}
        ${isReserved ? 'border-red-100 bg-red-50 cursor-not-allowed opacity-70' : ''}
      `}
    >
      <div className="flex items-start justify-between">
        <div
          className={`w-2.5 h-2.5 rounded-full mt-0.5 ${
            isAvailable ? 'bg-emerald-500' : isBlocked ? 'bg-amber-400' : 'bg-red-400'
          }`}
        />
        {isBlocked && (
          <span className="flex items-center gap-1 text-xs font-mono font-semibold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
            <Lock className="w-3 h-3" />
            {countdown}
          </span>
        )}
        {isReserved && (
          <span className="flex items-center gap-1 text-xs font-semibold text-red-500 bg-red-100 px-2 py-0.5 rounded-full">
            <CheckCircle className="w-3 h-3" />
            Ocupada
          </span>
        )}
      </div>

      <div>
        <h3 className="font-bold text-gray-900 text-lg leading-tight">{table.name}</h3>
        <div className="flex items-center gap-1 text-gray-400 text-sm mt-0.5">
          <MapPin className="w-3.5 h-3.5" />
          {table.zone}
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-sm text-gray-600">
        <Users className="w-4 h-4 text-gray-400" />
        <span>Hasta <strong>{table.capacity}</strong> personas</span>
      </div>

      {isAvailable && (
        <div className="mt-auto pt-2 border-t border-gray-100">
          <span className="text-brand-500 font-semibold text-sm">Reservar →</span>
        </div>
      )}
      {isBlocked && (
        <div className="mt-auto pt-2 border-t border-amber-100">
          <span className="text-amber-600 text-xs">Alguien está reservando esta mesa</span>
        </div>
      )}
    </div>
  )
}
