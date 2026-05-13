import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const adminSecret = req.headers.get('x-admin-secret')
  if (!adminSecret || adminSecret !== Deno.env.get('ADMIN_SECRET')) {
    return json({ error: 'Unauthorized' }, 401)
  }

  try {
    const body = await req.json()
    const { action } = body

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    if (action === 'toggle-lock') {
      const { tableId } = body
      if (!tableId) return json({ error: 'Missing tableId' }, 400)

      const { data: table } = await supabase
        .from('tables').select('status').eq('id', tableId).single()

      if (!table) return json({ error: 'Table not found' }, 404)

      if (table.status === 'blocked') {
        await supabase.from('tables').update({
          status: 'available', blocked_until: null, blocked_by_session: null,
        }).eq('id', tableId)
      } else {
        await supabase.from('tables').update({
          status: 'blocked',
          blocked_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          blocked_by_session: 'admin',
        }).eq('id', tableId)
      }
      return json({ success: true })
    }

    if (action === 'cancel-reservation') {
      const { reservationId } = body
      if (!reservationId) return json({ error: 'Missing reservationId' }, 400)

      const { error } = await supabase
        .from('reservations').update({ status: 'cancelled' }).eq('id', reservationId)

      if (error) return json({ error: 'Failed to cancel reservation' }, 500)
      return json({ success: true })
    }

    return json({ error: 'Unknown action' }, 400)
  } catch {
    return json({ error: 'Internal server error' }, 500)
  }
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
