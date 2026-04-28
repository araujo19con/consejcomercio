import type { HydratedIndicacao } from './types.ts'

function formatPhone(phone: string | null): string {
  if (!phone) return '—'
  return phone
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export function buildIndicacaoBlocks(ind: HydratedIndicacao, appUrl: string): unknown[] {
  const base = appUrl.replace(/\/$/, '')

  const indicanteHeader =
    ind.indicante_tipo === 'cliente'  ? '👤 Indicação de cliente' :
    ind.indicante_tipo === 'parceiro' ? '🤝 Indicação de parceiro' :
    '✨ Nova indicação'

  // Linha 1: campos do indicado
  const fieldsIndicado = [
    { type: 'mrkdwn', text: `*Nome*\n${ind.indicado_nome}` },
    { type: 'mrkdwn', text: `*Empresa*\n${ind.indicado_empresa ?? '—'}` },
    { type: 'mrkdwn', text: `*Telefone / WhatsApp*\n${formatPhone(ind.indicado_telefone)}` },
    { type: 'mrkdwn', text: `*E-mail*\n${ind.indicado_email ?? '—'}` },
  ]

  if (ind.segmento) {
    fieldsIndicado.push({ type: 'mrkdwn', text: `*Segmento de interesse*\n${ind.segmento}` })
  }

  // Linha 2: quem indicou
  const indicanteLines: string[] = []
  if (ind.indicante_nome) {
    indicanteLines.push(`*${ind.indicante_nome}*`)
  }
  if (ind.indicante_empresa) {
    indicanteLines.push(`_${ind.indicante_empresa}_`)
  }
  if (ind.indicante_email) {
    indicanteLines.push(ind.indicante_email)
  }
  if (ind.indicante_telefone) {
    indicanteLines.push(ind.indicante_telefone)
  }
  if (indicanteLines.length === 0) {
    indicanteLines.push('_Indicante não identificado_')
  }

  const blocks: unknown[] = [
    {
      type: 'header',
      text: { type: 'plain_text', text: `${indicanteHeader} — ${ind.indicado_empresa ?? ind.indicado_nome}`, emoji: true },
    },
    {
      type: 'context',
      elements: [
        { type: 'mrkdwn', text: `Recebida em *${formatDate(ind.created_at)}* · Status inicial: \`${ind.status}\`` },
      ],
    },
    { type: 'divider' },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: '*🎯 Lead indicado*' },
    },
    { type: 'section', fields: fieldsIndicado },
    { type: 'divider' },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: `*📣 Quem indicou*\n${indicanteLines.join(' · ')}` },
    },
  ]

  if (ind.portal_perfil_nome && ind.portal_tokens_creditados) {
    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `🪙 Indicação enviada pelo *Portal CONSEJ Coin* — \`+${ind.portal_tokens_creditados}\` tokens já creditados para *${ind.portal_perfil_nome}*.`,
        },
      ],
    })
  }

  if (ind.notas && !ind.notas.startsWith('Segmento:')) {
    blocks.push({ type: 'divider' })
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `*Notas adicionais:*\n>${ind.notas.replace(/\n/g, '\n>')}` },
    })
  }

  // Botões de ação
  const actions: unknown[] = []
  if (ind.lead_id) {
    actions.push({
      type: 'button',
      text: { type: 'plain_text', text: 'Abrir lead no CRM', emoji: true },
      url: `${base}/leads/${ind.lead_id}`,
      style: 'primary',
    })
  }
  actions.push({
    type: 'button',
    text: { type: 'plain_text', text: 'Ver indicações', emoji: true },
    url: `${base}/indicacoes`,
  })

  blocks.push({ type: 'divider' })
  blocks.push({ type: 'actions', elements: actions })

  return blocks
}

export function buildIndicacaoFallbackText(ind: HydratedIndicacao): string {
  const empresa = ind.indicado_empresa ?? ind.indicado_nome
  const indicante = ind.indicante_nome ?? 'desconhecido'
  return `Nova indicação: ${empresa} — indicado por ${indicante}`
}
