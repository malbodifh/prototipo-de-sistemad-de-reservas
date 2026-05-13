export type TableStatus = 'available' | 'blocked' | 'reserved'
export type ReservationStatus = 'pending' | 'confirmed' | 'cancelled'

export interface Table {
  id: string
  name: string
  capacity: number
  zone: string
  status: TableStatus
  blocked_until: string | null
  blocked_by_session: string | null
}

export interface Reservation {
  id: string
  table_id: string
  guest_name: string
  guest_email: string
  guest_phone: string
  party_size: number
  date: string
  time_slot: string
  status: ReservationStatus
  confirmation_code: string
  created_at: string
  table?: Table
}

export interface TimeSlot {
  time: string
  label: string
}

export type Database = {
  public: {
    Tables: {
      tables: {
        Row: Table
        Insert: Omit<Table, 'id'>
        Update: Partial<Omit<Table, 'id'>>
      }
      reservations: {
        Row: Reservation
        Insert: Omit<Reservation, 'id' | 'created_at' | 'confirmation_code'>
        Update: Partial<Omit<Reservation, 'id' | 'created_at'>>
      }
    }
  }
}
