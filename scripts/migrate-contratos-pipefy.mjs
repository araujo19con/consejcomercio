// migrate-contratos-pipefy.mjs
// Fetches Ganho Assessoria + Ganho Consultoria cards from Pipefy
// and creates contracts linked to existing clients in Supabase.

const PIPEFY_TOKEN = process.env.PIPEFY_TOKEN
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_KEY

const PHASE_ASSESSORIA  = '333540034'
const PHASE_CONSULTORIA = '333540037'

// --- helpers -----------------------------------------------------------

function parseBRL(str) {
  if (!str) return null
  const clean = str.replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '')
  const n = parseFloat(clean)
  return isNaN(n) ? null : n
}

function parseDateBR(str) {
  if (!str) return null
  // "DD/MM/YYYY" or "DD/MM/YYYY HH:MM"
  const match = str.match(/^(\d{2})\/(\d{2})\/(\d{4})/)
  if (!match) return null
  const [, d, m, y] = match
  return `${y}-${m}-${d}`
}

function addMonths(dateStr, months) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  d.setMonth(d.getMonth() + months)
  return d.toISOString().slice(0, 10)
}

function getField(fields, name) {
  return fields.find(f => f.name === name)?.value ?? null
}

function mapAreas(projetos) {
  if (!projetos) return []
  let list = []
  try { list = JSON.parse(projetos) } catch { list = [projetos] }
  const map = {
    'Registro de Marca':             'propriedade_intelectual',
    'Assessoria jurídica permanente':'gestao_contratual',
    'Direito Contratual':            'contratos',
    'Direito Civil':                 'civil',
    'Direito Empresarial':           'empresarial',
    'Direito Digital':               'digital',
    'LGPD':                          'digital',
    'Direito Trabalhista':           'trabalhista',
    'Propriedade Intelectual':       'propriedade_intelectual',
    'Revisão Estatutária':           'estatuto',
  }
  const areas = []
  for (const item of list) {
    for (const [key, val] of Object.entries(map)) {
      if (item.includes(key) && !areas.includes(val)) areas.push(val)
    }
  }
  return areas
}

// --- Pipefy ------------------------------------------------------------

async function pipefy(query) {
  const res = await fetch('https://api.pipefy.com/graphql', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${PIPEFY_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })
  return res.json()
}

async function fetchPhaseCards(phaseId) {
  const cards = []
  let cursor = null
  while (true) {
    const after = cursor ? `, after: "${cursor}"` : ''
    const q = `{ phase(id: ${phaseId}) { cards(first: 50${after}) { pageInfo { hasNextPage endCursor } edges { node { id title fields { name value } created_at } } } } }`
    const data = await pipefy(q)
    const page = data.data?.phase?.cards
    if (!page) break
    for (const edge of page.edges) cards.push(edge.node)
    if (!page.pageInfo.hasNextPage) break
    cursor = page.pageInfo.endCursor
  }
  return cards
}

// --- Supabase ----------------------------------------------------------

async function supabaseReq(method, path, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    method,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  try { return JSON.parse(text) } catch { return text }
}

// --- main --------------------------------------------------------------

async function main() {
  console.log('Buscando clientes no Supabase...')
  const clientes = await supabaseReq('GET', '/clientes?select=id,nome,empresa&status=eq.ativo&limit=500')
  if (!Array.isArray(clientes)) { console.error('Erro ao buscar clientes:', clientes); process.exit(1) }
  console.log(`${clientes.length} clientes carregados`)

  // Build lookup map: normalized name → cliente
  const lookup = new Map()
  for (const c of clientes) {
    lookup.set(c.nome?.toLowerCase().trim(), c)
    lookup.set(c.empresa?.toLowerCase().trim(), c)
  }

  // Fetch existing contracts to avoid duplicates
  const existing = await supabaseReq('GET', '/contratos?select=cliente_id&limit=500')
  const existingClientIds = new Set(Array.isArray(existing) ? existing.map(c => c.cliente_id) : [])
  console.log(`${existingClientIds.size} clientes já têm contrato`)

  // Fetch cards from both won phases
  console.log('\nBuscando cards Ganho Assessoria...')
  const assessoriaCards = await fetchPhaseCards(PHASE_ASSESSORIA)
  console.log(`  ${assessoriaCards.length} cards`)

  console.log('Buscando cards Ganho Consultoria...')
  const consultoriaCards = await fetchPhaseCards(PHASE_CONSULTORIA)
  console.log(`  ${consultoriaCards.length} cards`)

  const allCards = [
    ...assessoriaCards.map(c => ({ ...c, phaseType: 'assessoria' })),
    ...consultoriaCards.map(c => ({ ...c, phaseType: 'consultoria' })),
  ]

  let created = 0, skipped = 0, noMatch = 0

  for (const card of allCards) {
    const title = card.title?.toLowerCase().trim()
    const leadInteressado = getField(card.fields, 'Lead Interessado')?.toLowerCase().trim()

    // Try to match client
    const cliente = lookup.get(title) ?? lookup.get(leadInteressado)

    if (!cliente) {
      console.log(`  [sem match] "${card.title}"`)
      noMatch++
      continue
    }

    if (existingClientIds.has(cliente.id)) {
      console.log(`  [já existe] "${cliente.nome}" (${cliente.empresa})`)
      skipped++
      continue
    }

    const tipo = card.phaseType
    const isConsultoria = tipo === 'consultoria'
    const isAssessoria  = tipo === 'assessoria'

    const valorStr       = isConsultoria
      ? getField(card.fields, 'Valor Fechado Consultoria')
      : getField(card.fields, 'Valor Fechado Assessoria')
    const obsDemanda     = isConsultoria
      ? getField(card.fields, 'Observações Demandas Consultoria')
      : getField(card.fields, 'Observações Demandas Assessoria')
    const obsVP          = isConsultoria
      ? getField(card.fields, 'Observações Vice-Presidência Consultoria')
      : getField(card.fields, 'Observações Vice-Presidência Assessoria')
    const projetos       = getField(card.fields, 'Quais os possíveis projetos o cliente necessita?')
    const dataInicio     = parseDateBR(getField(card.fields, 'Data do primeiro contato'))
    const valorTotal     = parseBRL(valorStr)
    const areas          = mapAreas(projetos)

    // Infer model
    let modelo = 'consultoria_pontual'
    if (isAssessoria) {
      const hasRM = areas.includes('propriedade_intelectual')
      modelo = hasRM ? 'resgate' : 'assessoria_12m'
    }

    // RM status
    const rmStatus = areas.includes('propriedade_intelectual') ? 'em_andamento' : 'nao_aplicavel'

    // data_fim
    const dataFim = isAssessoria && dataInicio ? addMonths(dataInicio, 12) : null

    const notasCombinadas = [
      obsDemanda ? `[Demandas] ${obsDemanda}` : null,
      obsVP      ? `[VP] ${obsVP}`            : null,
    ].filter(Boolean).join('\n\n')

    const contrato = {
      cliente_id:          cliente.id,
      tipo,
      modelo_precificacao: modelo,
      areas_direito:       areas.length > 0 ? areas : [tipo === 'assessoria' ? 'gestao_contratual' : 'contratos'],
      valor_total:         valorTotal,
      valor_mensal:        isAssessoria && valorTotal ? Math.round(valorTotal / 12 * 100) / 100 : null,
      data_inicio:         dataInicio,
      data_fim:            dataFim,
      status:              'ativo',
      rm_status:           rmStatus,
      notas:               notasCombinadas || null,
    }

    const result = await supabaseReq('POST', '/contratos', contrato)
    if (Array.isArray(result) && result[0]?.id) {
      console.log(`  ✓ ${cliente.nome} (${cliente.empresa}) — ${tipo} — ${valorStr ?? '—'}`)
      existingClientIds.add(cliente.id)
      created++
    } else {
      console.log(`  ✗ Erro para "${cliente.nome}":`, JSON.stringify(result))
    }
  }

  console.log(`\n=== RESULTADO ===`)
  console.log(`Contratos criados:  ${created}`)
  console.log(`Já existiam:        ${skipped}`)
  console.log(`Sem match:          ${noMatch}`)
}

main().catch(console.error)
