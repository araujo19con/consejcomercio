import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const SLACK_TOKEN = Deno.env.get('SLACK_BOT_TOKEN')
    if (!SLACK_TOKEN) {
      return new Response(
        JSON.stringify({ ok: false, error: 'SLACK_BOT_TOKEN não configurado. Adicione o secret no Supabase.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { action, channel, limit = 30, cursor } = await req.json()

    const slackFetch = (url: string) =>
      fetch(url, { headers: { Authorization: `Bearer ${SLACK_TOKEN}` } }).then((r) => r.json())

    let data: unknown

    if (action === 'list_channels') {
      data = await slackFetch(
        'https://slack.com/api/conversations.list?types=public_channel,private_channel&limit=200&exclude_archived=true'
      )
    } else if (action === 'get_messages') {
      if (!channel) throw new Error('channel é obrigatório')
      const params = new URLSearchParams({ channel, limit: String(limit) })
      if (cursor) params.set('cursor', cursor)
      data = await slackFetch(`https://slack.com/api/conversations.history?${params}`)
    } else if (action === 'get_user') {
      if (!channel) throw new Error('user id é obrigatório')
      data = await slackFetch(`https://slack.com/api/users.info?user=${channel}`)
    } else {
      throw new Error(`Ação desconhecida: ${action}`)
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
