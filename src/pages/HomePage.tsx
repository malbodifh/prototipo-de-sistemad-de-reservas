import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Calendar, Clock, Users, ChevronRight, Star, MapPin } from 'lucide-react'
import { TIME_SLOTS } from '../lib/constants'
import { format, addDays } from 'date-fns'
import { es } from 'date-fns/locale'

export default function HomePage() {
  const navigate = useNavigate()
  const today = format(new Date(), 'yyyy-MM-dd')

  const [date, setDate] = useState(today)
  const [time, setTime] = useState('20:00')
  const [guests, setGuests] = useState(2)

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    navigate(`/mesas?date=${date}&time=${time}&guests=${guests}`)
  }

  const quickDates = [0, 1, 2, 3].map(i => {
    const d = addDays(new Date(), i)
    return {
      value: format(d, 'yyyy-MM-dd'),
      label: i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : format(d, 'EEE d', { locale: es }),
    }
  })

  return (
    <div>
      {/* Hero */}
      <section className="relative min-h-[620px] flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1600&q=80')",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70" />

        <div className="relative z-10 text-center px-6 max-w-3xl mx-auto">
          <p className="text-brand-300 font-semibold tracking-widest text-sm uppercase mb-4">
            Reservas sin complicaciones
          </p>
          <h1 className="text-5xl md:text-6xl font-bold text-white leading-tight mb-6">
            Tu mesa perfecta,
            <br />
            <span className="text-brand-400">en segundos</span>
          </h1>
          <p className="text-white/70 text-lg mb-10">
            Elige fecha, hora y número de personas. Confirmación inmediata.
          </p>

          {/* Search card */}
          <form
            onSubmit={handleSearch}
            className="bg-white rounded-2xl shadow-2xl p-6 text-left"
          >
            {/* Quick dates */}
            <div className="flex gap-2 mb-5 overflow-x-auto scrollbar-hide">
              {quickDates.map(d => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setDate(d.value)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                    date === d.value
                      ? 'bg-brand-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Date */}
              <div className="relative">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Fecha
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type="date"
                    value={date}
                    min={today}
                    onChange={e => setDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Time */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Hora
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <select
                    value={time}
                    onChange={e => setTime(e.target.value)}
                    className="w-full pl-9 pr-3 py-3 border border-gray-200 rounded-xl text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent bg-white"
                  >
                    {TIME_SLOTS.map(slot => (
                      <option key={slot.time} value={slot.time}>
                        {slot.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Guests */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Personas
                </label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <select
                    value={guests}
                    onChange={e => setGuests(Number(e.target.value))}
                    className="w-full pl-9 pr-3 py-3 border border-gray-200 rounded-xl text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent bg-white"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                      <option key={n} value={n}>
                        {n} {n === 1 ? 'persona' : 'personas'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="mt-4 w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-brand-500/30"
            >
              <Search className="w-4 h-4" />
              Buscar mesas disponibles
              <ChevronRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">¿Por qué MesaYa?</h2>
          <p className="text-gray-500 text-lg">Reservar no debería ser complicado</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: '⚡',
              title: 'Confirmación instantánea',
              desc: 'Recibe tu código de reserva en segundos, sin esperas ni llamadas.',
            },
            {
              icon: '🔒',
              title: 'Mesa reservada para ti',
              desc: 'Al seleccionar una mesa se bloquea 3 minutos mientras completas tu reserva.',
            },
            {
              icon: '📱',
              title: 'Gestiona fácilmente',
              desc: 'Consulta, modifica o cancela tu reserva con tu código de confirmación.',
            },
          ].map(f => (
            <div
              key={f.title}
              className="bg-white border border-gray-100 rounded-2xl p-8 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
            >
              <div className="text-4xl mb-4">{f.icon}</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="bg-brand-500 py-16">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white">
          {[
            { value: '12', label: 'Mesas disponibles' },
            { value: '4', label: 'Zonas del restaurante' },
            { value: '3 min', label: 'Bloqueo garantizado' },
            { value: '100%', label: 'Online, sin llamadas' },
          ].map(s => (
            <div key={s.label}>
              <div className="text-4xl font-bold mb-1">{s.value}</div>
              <div className="text-white/70 text-sm">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
          Lo que dicen nuestros clientes
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              name: 'Carlos M.',
              text: 'Reservé en menos de un minuto. El sistema es clarísimo y la confirmación llegó al instante.',
              rating: 5,
              location: 'Madrid',
            },
            {
              name: 'Laura P.',
              text: 'Me encanta poder elegir la zona. Siempre pedimos la terraza y nunca ha fallado.',
              rating: 5,
              location: 'Barcelona',
            },
            {
              name: 'Miguel A.',
              text: 'Perfecto para cenas de empresa. Reservé mesa para 8 sin ningún problema.',
              rating: 5,
              location: 'Valencia',
            },
          ].map(t => (
            <div
              key={t.name}
              className="bg-gray-50 rounded-2xl p-6 hover:bg-white hover:shadow-md transition-all"
            >
              <div className="flex gap-1 mb-3">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-gray-600 leading-relaxed mb-4">"{t.text}"</p>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center text-brand-600 font-semibold text-sm">
                  {t.name[0]}
                </div>
                <div>
                  <div className="font-medium text-sm text-gray-900">{t.name}</div>
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <MapPin className="w-3 h-3" />
                    {t.location}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
