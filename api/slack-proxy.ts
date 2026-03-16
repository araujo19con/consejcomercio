/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' })

  const SLACK_TOKEN = process.env.SLACK_BOT_TOKEN
  if (!SLACK_TOKEN) {
    return res.status(500).json({
      ok: false,
      error: 'SLACK_BOT_TOKEN não configurado. Adicione em Vercel → Settings → Environment Variables.',
    })
  }

  try {
    const { action, channel, limit = 30, cursor } = req.body ?? {}

    const slackFetch = (url: string) =>
      fetch(url, { headers: { Authorization: `Bearer ${SLACK_TOKEN}` } }).then((r) => r.json())

    if (action === 'list_channels') {
      // Busca em todas as páginas e retorna apenas canais onde o bot é membro
      const allChannels: any[] = []
      let nextCursor: string | undefined

      do {
        const params = new URLSearchParams({
          types: 'public_channel,private_channel',
          limit: '200',
          exclude_archived: 'true',
        })
        if (nextCursor) params.set('cursor', nextCursor)

        const data = await slackFetch(`https://slack.com/api/conversations.list?${params}`)
        if (!data.ok) return res.status(200).json(data)

        allChannels.push(...(data.channels ?? []))
        nextCursor = data.response_metadata?.next_cursor
      } while (nextCursor)

      // Filtra apenas canais onde o bot foi adicionado (is_member: true)
      const memberChannels = allChannels.filter((c: any) => c.is_member)

      return res.status(200).json({ ok: true, channels: memberChannels })
    }

    if (action === 'get_messages') {
      if (!channel) return res.status(400).json({ ok: false, error: 'channel é obrigatório' })
      const params = new URLSearchParams({ channel, limit: String(limit) })
      if (cursor) params.set('cursor', cursor)
      const data = await slackFetch(`https://slack.com/api/conversations.history?${params}`)
      return res.status(200).json(data)
    }

    if (action === 'get_user') {
      if (!channel) return res.status(400).json({ ok: false, error: 'user id é obrigatório' })
      const data = await slackFetch(`https://slack.com/api/users.info?user=${channel}`)
      return res.status(200).json(data)
    }

    return res.status(400).json({ ok: false, error: `Ação desconhecida: ${action}` })
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message })
  }
}
