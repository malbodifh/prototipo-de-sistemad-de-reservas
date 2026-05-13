import type { TimeSlot } from '../types/database'

export const TIME_SLOTS: TimeSlot[] = [
  { time: '12:00', label: '12:00 PM' },
  { time: '12:30', label: '12:30 PM' },
  { time: '13:00', label: '1:00 PM' },
  { time: '13:30', label: '1:30 PM' },
  { time: '14:00', label: '2:00 PM' },
  { time: '14:30', label: '2:30 PM' },
  { time: '19:00', label: '7:00 PM' },
  { time: '19:30', label: '7:30 PM' },
  { time: '20:00', label: '8:00 PM' },
  { time: '20:30', label: '8:30 PM' },
  { time: '21:00', label: '9:00 PM' },
  { time: '21:30', label: '9:30 PM' },
]

export const ZONES = ['Terraza', 'Salón Principal', 'Barra', 'Privado']

export const BLOCK_DURATION_MS = 3 * 60 * 1000 // 3 minutes
