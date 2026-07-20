import type { HydratedLead } from './types.ts'

const STAGE_LABELS: Record<string, string> = {
  ganho_assessoria: 'Ganho – Assessoria',
  ganho_consultoria: 'Ganho – Consultoria',
}

const ORIGEM_LABELS: Record<string, string> = {
  indicacao_cliente: 'Indicação de Cliente',
  indicacao_parceiro: 'Indicação de Parceiro',
  evento: 'Evento / Workshop',
  redes_sociais: 'Redes Sociais',
  site: 'Site (inbound)',
  mej: 'Rede MEJ',
  outro: 'Outro',
}

function formatBRL(value: number | null): string {
  if (value === null || value === undefined) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch {
    return iso
  }
}

function joinServicos(servicos: string[] | null): string {
  if (!servicos || servicos.length === 0) return '—'
  return servicos.join(', ')
}

export function buildHandoffBlocks(lead: HydratedLead, appUrl: string): unknown[] {
  const stageLabel = STAGE_LABELS[lead.status] ?? lead.status
  const leadUrl = `${appUrl.replace(/\/$/, '')}/leads/${lead.id}`

  const fields = [
    { type: 'mrkdwn', text: `*Empresa*\n${lead.empresa}` },
    { type: 'mrkdwn', text: `*Contato*\n${lead.nome}` },
    { type: 'mrkdwn', text: `*Serviço fechado*\n${stageLabel}` },
    { type: 'mrkdwn', text: `*Segmento*\n${lead.segmento}` },
    { type: 'mrkdwn', text: `*Closer*\n${lead.closer_nome ?? '—'}` },
    { type: 'mrkdwn', text: `*Prospector*\n${lead.prospector_nome ?? lead.responsavel ?? '—'}` },
    { type: 'mrkdwn', text: `*Telefone*\n${lead.telefone}` },
    { type: 'mrkdwn', text: `*E-mail*\n${lead.email ?? '—'}` },
    { type: 'mrkdwn', text: `*Origem*\n${ORIGEM_LABELS[lead.origem] ?? lead.origem}` },
    { type: 'mrkdwn', text: `*Investimento estimado*\n${lead.investimento_estimado ?? '—'}` },
  ]

  if (lead.contrato_tipo) {
    fields.push(
      { type: 'mrkdwn', text: `*Contrato — tipo*\n${lead.contrato_tipo}` },
      { type: 'mrkdwn', text: `*Modelo*\n${lead.contrato_modelo_precificacao ?? '—'}` },
      { type: 'mrkdwn', text: `*Valor total*\n${formatBRL(lead.contrato_valor_total)}` },
      { type: 'mrkdwn', text: `*Valor mensal*\n${formatBRL(lead.contrato_valor_mensal)}` },
    )
  }

  const blocks: unknown[] = [
    {
      type: 'header',
      text: { type: 'plain_text', text: `🎯 Novo cliente fechado — ${lead.empresa}`, emoji: true },
    },
    {
      type: 'context',
      elements: [
        { type: 'mrkdwn', text: `Data de fechamento: *${formatDate(lead.updated_at)}* · Diagnóstico: ${formatDate(lead.data_diagnostico)}` },
      ],
    },
    { type: 'section', fields: fields.slice(0, 10) },
  ]

  if (fields.length > 10) {
    blocks.push({ type: 'section', fields: fields.slice(10) })
  }

  if (lead.servicos_interesse && lead.servicos_interesse.length > 0) {
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `*Áreas de interesse:*\n${joinServicos(lead.servicos_interesse)}` },
    })
  }

  if (lead.diagnostico_cluster) {
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `*Cluster recomendado (diagnóstico):* ${lead.diagnostico_cluster}` },
    })
  }

  if (lead.notas) {
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `*Notas do Closer:*\n>${lead.notas.replace(/\n/g, '\n>')}` },
    })
  }

  const dossieBlocks = buildDossieBlocks(lead)
  if (dossieBlocks.length > 0) {
    blocks.push({ type: 'divider' })
    blocks.push({
      type: 'header',
      text: { type: 'plain_text', text: '📋 Dossiê Digital do Cliente', emoji: true },
    })
    for (const b of dossieBlocks) blocks.push(b)
  }

  blocks.push({ type: 'divider' })
  blocks.push({
    type: 'section',
    text: { type: 'mrkdwn', text: '🎙️ *Áudios/vídeos do Closer:* serão publicados nesta thread conforme enviados pelo CRM.' },
  })
  blocks.push({
    type: 'actions',
    elements: [
      {
        type: 'button',
        text: { type: 'plain_text', text: 'Abrir no CRM', emoji: true },
        url: leadUrl,
        style: 'primary',
      },
    ],
  })

  return blocks
}

export function buildFallbackText(lead: HydratedLead): string {
  const stageLabel = STAGE_LABELS[lead.status] ?? lead.status
  return `Novo cliente fechado: ${lead.empresa} (${stageLabel}) — Closer: ${lead.closer_nome ?? '—'}`
}

function buildDossieBlocks(lead: HydratedLead): unknown[] {
  const items: { label: string; value: string | null }[] = [
    { label: '🎯 Dores e expectativas', value: lead.dossie_dores_expectativas },
    { label: '📡 Perfil de comunicação', value: lead.dossie_perfil_comunicacao },
    { label: '💰 Informações financeiras', value: lead.dossie_info_financeira },
    { label: '📅 Prazos e marcos', value: lead.dossie_prazos_marcos },
  ].filter((i) => i.value && i.value.trim().length > 0)

  return items.map((i) => ({
    type: 'section',
    text: { type: 'mrkdwn', text: `*${i.label}*\n>${(i.value ?? '').replace(/\n/g, '\n>')}` },
  }))
}
