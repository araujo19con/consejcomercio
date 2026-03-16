import type { IncomingMessage, ServerResponse } from 'node:http'

type Req = IncomingMessage & { body: { action: string; channel?: string; limit?: number; cursor?: string } }
type Res = ServerResponse & {
  status: (code: number) => Res
  json: (data: unknown) => void
  end: () => void
  setHeader: (k: string, v: string) => void
}

export default async function handler(req: Req, res: Res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') { res.status(200).end(); return }
  if (req.method !== 'POST') { res.status(405).json({ ok: false, error: 'Method not allowed' }); return }

  const SLACK_TOKEN = process.env.SLACK_BOT_TOKEN
  if (!SLACK_TOKEN) {
    res.status(500).json({ ok: false, error: 'SLACK_BOT_TOKEN não configurado no Vercel. Vá em Settings → Environment Variables.' })
    return
  }

  try {
    const { action, channel, limit = 30, cursor } = req.body

    const slackFetch = (url: string) =>
      fetch(url, { headers: { Authorization: `Bearer ${SLACK_TOKEN}` } }).then((r) => r.json())

    let data: unknown

    if (action === 'list_channels') {
      data = await slackFetch(
        'https://slack.com/api/conversations.list?types=public_channel,private_channel&limit=200&exclude_archived=true'
      )
    } else if (action === 'get_messages') {
      if (!channel) { res.status(400).json({ ok: false, error: 'channel é obrigatório' }); return }
      const params = new URLSearchParams({ channel, limit: String(limit) })
      if (cursor) params.set('cursor', cursor)
      data = await slackFetch(`https://slack.com/api/conversations.history?${params}`)
    } else if (action === 'get_user') {
      if (!channel) { res.status(400).json({ ok: false, error: 'user id é obrigatório' }); return }
      data = await slackFetch(`https://slack.com/api/users.info?user=${channel}`)
    } else {
      res.status(400).json({ ok: false, error: `Ação desconhecida: ${action}` }); return
    }

    res.status(200).json(data)
  } catch (err) {
    res.status(500).json({ ok: false, error: (err as Error).message })
  }
}
