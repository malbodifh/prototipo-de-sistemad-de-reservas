# MesaYa — Documentación de Base de Datos

> **Proyecto Supabase:** `weohpdgxtmuytwjxareq`
> **Última actualización:** Mayo 2026
> **Archivo de referencia:** `schema.sql` — contiene el SQL completo ejecutable

---

## Arquitectura general

```
Browser (anon key)
    │
    ├── SELECT directo          → tablas con RLS (solo lectura)
    ├── supabase.rpc(...)       → RPC Functions (SECURITY DEFINER)
    │       └── block_table
    │       └── create_reservation
    │       └── release_block
    │
    └── supabase.functions.invoke('admin-action')
            └── Edge Function (valida x-admin-secret header)
                    └── service role key → escritura libre
```

**Regla de oro:** El `anon key` nunca escribe directamente en la DB. Toda escritura pasa por funciones controladas.

---

## Tablas

### `public.tables`
Representa las mesas físicas del restaurante.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | `uuid` | PK, generado automáticamente |
| `name` | `text` | Nombre visible (ej: "Mesa 1") |
| `capacity` | `int` | Personas máximas |
| `zone` | `text` | Zona: `Terraza`, `Salón Principal`, `Barra`, `Privado` |
| `status` | `text` | Estado actual: `available`, `blocked`, `reserved` |
| `blocked_until` | `timestamptz` | Timestamp de expiración del bloqueo |
| `blocked_by_session` | `text` | UUID de sesión del browser que bloqueó (o `'admin'`) |

**Estados posibles de `status`:**
- `available` → la mesa está libre
- `blocked` → alguien está en proceso de reservar (máx 3 min)
- `reserved` → tiene una reserva confirmada para ese día/hora

---

### `public.reservations`
Registra todas las reservas realizadas.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | `uuid` | PK, generado automáticamente |
| `table_id` | `uuid` | FK → `tables.id` |
| `guest_name` | `text` | Nombre del huésped |
| `guest_email` | `text` | Email de contacto |
| `guest_phone` | `text` | Teléfono de contacto |
| `party_size` | `int` | Número de personas |
| `date` | `date` | Fecha de la reserva (ej: `2026-05-12`) |
| `time_slot` | `text` | Franja horaria (ej: `20:00`) |
| `status` | `text` | `pending`, `confirmed`, `cancelled` |
| `confirmation_code` | `text` | Código único de 8 caracteres (ej: `A1B2C3D4`) |
| `created_at` | `timestamptz` | Timestamp de creación |

---

## RLS (Row Level Security)

| Tabla | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `tables` | ✅ anon | ❌ | ❌ | ❌ |
| `reservations` | ✅ anon | ❌ | ❌ | ❌ |

Toda escritura ocurre dentro de RPC Functions o la Edge Function de admin, que tienen privilegios elevados.

---

## RPC Functions

Llamadas desde el frontend con `supabase.rpc('nombre', { params })`.
Corren con `SECURITY DEFINER` (privilegios de postgres, bypassean RLS).
Solo el rol `anon` tiene permiso de ejecutarlas.

### `block_table(p_table_id, p_session_id)`
Bloquea una mesa para una sesión de browser.

**Lógica de seguridad:**
- Usa un `UPDATE ... WHERE ... RETURNING *` atómico — sin race conditions
- Solo actualiza si la mesa está `available`, o si su bloqueo expiró, o si la sesión ya la tenía bloqueada
- Si 0 filas son afectadas → consulta el motivo y devuelve error descriptivo

**Respuesta exitosa:**
```json
{ "success": true, "blockedUntil": "2026-05-12T20:03:00Z", "table": { ...tabla } }
```

---

### `create_reservation(p_table_id, p_session_id, p_guest_name, p_guest_email, p_guest_phone, p_party_size, p_date, p_time_slot)`
Crea una reserva confirmada.

**Lógica de seguridad:**
- `SELECT ... FOR UPDATE` bloquea la fila durante toda la transacción
- Valida que `blocked_by_session = p_session_id` (no puedes reservar con el bloqueo de otro)
- Valida que `blocked_until > now()` (el tiempo no expiró)
- Verifica que no exista otra reserva para esa mesa/fecha/hora
- Inserta la reserva y marca la mesa como `reserved` en la misma transacción

**Respuesta exitosa:**
```json
{ "success": true, "reservation": { ...reserva } }
```

---

### `release_block(p_table_id, p_session_id)`
Libera el bloqueo de una mesa.

**Lógica de seguridad:**
- `WHERE blocked_by_session = p_session_id` — solo el dueño puede liberarlo
- Si el sessionId no coincide, el UPDATE afecta 0 filas (sin error, sin efecto)

**Respuesta exitosa:**
```json
{ "success": true }
```

---

## Edge Function

### `admin-action`
Desplegada en Supabase Edge Functions. Maneja operaciones administrativas.

**Autenticación:** Header `x-admin-secret` comparado contra la variable de entorno `ADMIN_SECRET`.

**Acciones disponibles:**

| `action` | Parámetros | Descripción |
|----------|-----------|-------------|
| `toggle-lock` | `tableId` | Bloquea/desbloquea una mesa manualmente |
| `cancel-reservation` | `reservationId` | Cancela una reserva |

**Variables de entorno requeridas en Supabase:**
- `ADMIN_SECRET` → valor secreto que debe coincidir con `VITE_ADMIN_SECRET` del frontend

---

## Cron Jobs

### `unblock-expired-tables`
- **Frecuencia:** cada minuto (`* * * * *`)
- **Función:** `public.unblock_expired_tables()`
- **Qué hace:** libera mesas donde `blocked_until < now()` y `blocked_by_session != 'admin'`
- **Por qué excluye admin:** las mesas bloqueadas manualmente por el admin tienen `blocked_until` de 24h y no deben liberarse automáticamente

---

## Realtime

Ambas tablas tienen Realtime activado:
- `public.tables` → los cambios de estado se propagan a todos los browsers en ~100ms
- `public.reservations` → las nuevas reservas actualizan el panel de admin en tiempo real

---

## Franjas horarias disponibles

| Turno | Horarios |
|-------|----------|
| Mediodía | 12:00, 12:30, 13:00, 13:30, 14:00, 14:30 |
| Noche | 19:00, 19:30, 20:00, 20:30, 21:00, 21:30 |

Definidos en `src/lib/constants.ts` → `TIME_SLOTS`.

---

## Zonas del restaurante

`Terraza` · `Salón Principal` · `Barra` · `Privado`

Definidas en `src/lib/constants.ts` → `ZONES`.

---

## Cómo actualizar este documento

Cada vez que se modifique la base de datos (nuevas tablas, columnas, funciones, políticas), actualizar:
1. `supabase/schema.sql` — el SQL ejecutable
2. `supabase/DATABASE.md` — esta documentación

Ambos archivos son la fuente de verdad del backend.
