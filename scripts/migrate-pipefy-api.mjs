/**
 * CONSEJ CRM — Migração via API do Pipefy
 * ========================================
 * Puxa os dados diretamente da API GraphQL do Pipefy e insere no Supabase.
 *
 * COMO USAR:
 *
 *   1. Gere um token no Pipefy:
 *      Avatar → My account → Personal access tokens → Generate new token
 *
 *   2. Obtenha a service_role key do Supabase:
 *      Supabase → Settings → API → service_role (secret)
 *
 *   3. PRIMEIRO: rode para listar seus Pipes e descobrir os IDs:
 *      PIPEFY_TOKEN=seu_token node scripts/migrate-pipefy-api.mjs --list-pipes
 *
 *   4. Configure os IDs dos pipes abaixo (PIPE_LEADS, PIPE_CLIENTES, PIPE_CONTRATOS)
 *
 *   5. Rode a importação completa:
 *      PIPEFY_TOKEN=seu_token SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_KEY=eyJ... node scripts/migrate-pipefy-api.mjs
 */

import { createClient } from '@supabase/supabase-js'

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURAÇÃO — preencha após rodar --list-pipes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * IDs dos Pipes no Pipefy.
 * Deixe null para pular aquele tipo de importação.
 *
 * Para descobrir os IDs: rode com --list-pipes primeiro.
 * Ou acesse o Pipe no Pipefy e veja a URL: pipefy.com/pipes/XXXXXX
 */
const PIPE_LEADS     = null  // ex: 123456  ← pipe de leads/pipeline
const PIPE_CLIENTES  = null  // ex: 123457  ← pipe de clientes ganhos (pode ser o mesmo)
const PIPE_CONTRATOS = null  // ex: null    ← deixe null se não tiver pipe separado

/**
 * Mapeamento de nomes de CAMPO do Pipefy → campo do CRM.
 *
 * O Pipefy chama os campos pelo "label" (nome visível) ou pelo "id" do campo.
 * Após rodar --list-pipes, o script mostrará os campos disponíveis.
 * Preencha os valores abaixo com os labels exatos do seu Pipefy.
 */
const LEADS_FIELD_MAP = {
  nome:                 'Nome',           // label do campo no Pipefy
  empresa:              'Empresa',
  telefone:             'Telefone',
  email:                'E-mail',
  segmento:             'Segmento',
  origem:               'Origem',
  notas:                'Observações',
  investimento_estimado:'Investimento',
  responsavel:          'Responsável',
  estado:               'Estado',
}

const CLIENTES_FIELD_MAP = {
  nome:     'Nome',
  empresa:  'Empresa',
  telefone: 'Telefone',
  email:    'E-mail',
  segmento: 'Segmento',
  notas:    'Observações',
  estado:   'Estado',
}

const CONTRATOS_FIELD_MAP = {
  empresa_cliente:    'Empresa',
  tipo:               'Tipo',
  modelo_precificacao:'Modelo',
  areas_direito:      'Áreas',
  valor_total:        'Valor Total',
  valor_mensal:       'Valor Mensal',
  data_inicio:        'Data Início',
  data_fim:           'Data Fim',
  notas:              'Observações',
}

/**
 * Mapa de FASES do Pipefy → status do CRM
 * Ajuste com os nomes exatos das suas fases.
 */
const STAGE_MAP = {
  'classificação':              'classificacao',
  'classificacao':              'classificacao',
  'levantamento de oportunidade':'levantamento_oportunidade',
  'levantamento':               'levantamento_oportunidade',
  'educar o lead':              'educar_lead',
  'educar lead':                'educar_lead',
  'proposta comercial':         'proposta_comercial',
  'proposta':                   'proposta_comercial',
  'negociação':                 'negociacao',
  'negociacao':                 'negociacao',
  'stand by':                   'stand_by',
  'stand_by':                   'stand_by',
  'ganho – assessoria':         'ganho_assessoria',
  'ganho assessoria':           'ganho_assessoria',
  'ganho – consultoria':        'ganho_consultoria',
  'ganho consultoria':          'ganho_consultoria',
  'ganho':                      'ganho_assessoria',
  'perdido':                    'perdido',
  'cancelado':                  'cancelado',
}

// ─────────────────────────────────────────────────────────────────────────────
// GraphQL helpers
// ─────────────────────────────────────────────────────────────────────────────

const PIPEFY_API = 'https://api.pipefy.com/graphql'

async function gql(token, query, variables = {}) {
  const res = await fetch(PIPEFY_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
  })
  const json = await res.json()
  if (json.errors) {
    throw new Error(json.errors.map(e => e.message).join('; '))
  }
  return json.data
}

// List all pipes accessible by the token
async function listPipes(token) {
  const data = await gql(token, `
    query {
      me {
        name
        email
        organizations {
          name
          pipes {
            id
            name
            phases {
              id
              name
            }
            start_form_fields {
              id
              label
              type
            }
          }
        }
      }
    }
  `)
  return data.me
}

// Fetch all cards from a pipe (paginated)
async function fetchAllCards(token, pipeId) {
  const cards = []
  let cursor = null
  let hasMore = true

  console.log(`   Buscando cards do pipe ${pipeId}...`)

  while (hasMore) {
    const data = await gql(token, `
      query FetchCards($pipeId: ID!, $after: String) {
        pipe(id: $pipeId) {
          cards(first: 50, after: $after) {
            pageInfo {
              hasNextPage
              endCursor
            }
            edges {
              node {
                id
                title
                current_phase {
                  name
                }
                fields {
                  name
                  value
                  array_value
                  date_value
                }
                created_at
                updated_at
              }
            }
          }
        }
      }
    `, { pipeId: String(pipeId), after: cursor })

    const page = data.pipe.cards
    cards.push(...page.edges.map(e => e.node))
    hasMore = page.pageInfo.hasNextPage
    cursor = page.pageInfo.endCursor

    process.stdout.write(`\r   ${cards.length} cards carregados...`)
  }

  console.log(`\r   ✓ ${cards.length} cards encontrados           `)
  return cards
}

// ─────────────────────────────────────────────────────────────────────────────
// Field extraction
// ─────────────────────────────────────────────────────────────────────────────

function getField(card, fieldLabel) {
  if (!fieldLabel) return ''
  const field = card.fields.find(f =>
    f.name?.toLowerCase() === fieldLabel.toLowerCase()
  )
  if (!field) return ''
  if (field.array_value?.length) return field.array_value.join(', ')
  if (field.date_value) return field.date_value
  return field.value ?? ''
}

// ─────────────────────────────────────────────────────────────────────────────
// Normalizers (same as migrate-pipefy.mjs)
// ─────────────────────────────────────────────────────────────────────────────

const SEGMENTO_MAP = {
  'empresa júnior': 'empresa_junior', 'empresa junior': 'empresa_junior', 'ej': 'empresa_junior',
  'empresa sênior': 'empresa_senior', 'empresa senior': 'empresa_senior',
  'startup': 'startup',
  'arquitetura': 'escritorio_arquitetura', 'escritório': 'escritorio_arquitetura',
  'design': 'empresa_design',
  'gestão': 'empresa_gestao', 'gestao': 'empresa_gestao', 'compliance': 'empresa_gestao',
}

const ORIGEM_MAP = {
  'indicação de cliente': 'indicacao_cliente', 'indicacao de cliente': 'indicacao_cliente',
  'indicação de parceiro': 'indicacao_parceiro', 'indicacao de parceiro': 'indicacao_parceiro',
  'evento': 'evento', 'workshop': 'evento',
  'redes sociais': 'redes_sociais', 'instagram': 'redes_sociais', 'linkedin': 'redes_sociais',
  'site': 'site', 'inbound': 'site',
  'mej': 'mej', 'rede mej': 'mej',
}

function norm(map, value, fallback) {
  return map[value?.toLowerCase()?.trim()] ?? fallback
}

function parseDate(s) {
  if (!s) return null
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10)
  const parts = s.split(/[\/\-]/)
  if (parts.length !== 3) return null
  if (parts[2].length === 4) return `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`
  return null
}

function parseNum(s) {
  if (!s) return null
  const cleaned = String(s).replace(/R\$\s?/g, '').replace(/\./g, '').replace(',', '.').trim()
  const n = parseFloat(cleaned)
  return isNaN(n) ? null : n
}

// ─────────────────────────────────────────────────────────────────────────────
// Transformers
// ─────────────────────────────────────────────────────────────────────────────

function cardToLead(card) {
  const nome    = getField(card, LEADS_FIELD_MAP.nome)    || card.title
  const empresa = getField(card, LEADS_FIELD_MAP.empresa) || card.title
  if (!nome || !empresa) return null

  const phaseName = card.current_phase?.name ?? ''
  const status = STAGE_MAP[phaseName.toLowerCase()] ?? 'classificacao'

  return {
    nome,
    empresa,
    telefone:             getField(card, LEADS_FIELD_MAP.telefone) || 'Não informado',
    email:                getField(card, LEADS_FIELD_MAP.email) || null,
    segmento:             norm(SEGMENTO_MAP, getField(card, LEADS_FIELD_MAP.segmento), 'outro'),
    origem:               norm(ORIGEM_MAP,   getField(card, LEADS_FIELD_MAP.origem),   'outro'),
    status,
    notas:                getField(card, LEADS_FIELD_MAP.notas) || null,
    investimento_estimado:getField(card, LEADS_FIELD_MAP.investimento_estimado) || null,
    responsavel:          getField(card, LEADS_FIELD_MAP.responsavel) || null,
    estado:               getField(card, LEADS_FIELD_MAP.estado) || null,
    servicos_interesse:   [],
  }
}

function cardToCliente(card) {
  const nome    = getField(card, CLIENTES_FIELD_MAP.nome)    || card.title
  const empresa = getField(card, CLIENTES_FIELD_MAP.empresa) || card.title
  if (!nome || !empresa) return null

  const STATUS = {
    'ativo': 'ativo', 'em renovação': 'em_renovacao', 'em renovacao': 'em_renovacao', 'encerrado': 'encerrado'
  }
  const rawStatus = card.current_phase?.name ?? ''

  return {
    nome,
    empresa,
    segmento: norm(SEGMENTO_MAP, getField(card, CLIENTES_FIELD_MAP.segmento), 'outro'),
    status:   norm(STATUS, rawStatus, 'ativo'),
    telefone: getField(card, CLIENTES_FIELD_MAP.telefone) || null,
    email:    getField(card, CLIENTES_FIELD_MAP.email) || null,
    notas:    getField(card, CLIENTES_FIELD_MAP.notas) || null,
    estado:   getField(card, CLIENTES_FIELD_MAP.estado) || null,
  }
}

function cardToContrato(card, clienteId) {
  if (!clienteId) return null
  const TIPOS = {
    'assessoria': 'assessoria', 'assessoria jurídica': 'assessoria',
    'consultoria': 'consultoria', 'consultoria jurídica': 'consultoria',
    'resgate': 'resgate',
  }
  const MODELOS = {
    'mensal': 'mensal', 'por demanda': 'por_demanda', 'híbrido': 'hibrido', 'hibrido': 'hibrido',
  }
  const STATUS = { 'ativo': 'ativo', 'encerrado': 'encerrado', 'suspenso': 'suspenso' }

  const rawAreas = getField(card, CONTRATOS_FIELD_MAP.areas_direito)
  const areas = rawAreas ? rawAreas.split(/[,;]/).map(s => s.trim().toLowerCase()).filter(Boolean) : ['empresarial']

  return {
    cliente_id: clienteId,
    tipo:                norm(TIPOS,   getField(card, CONTRATOS_FIELD_MAP.tipo),                'assessoria'),
    modelo_precificacao: norm(MODELOS, getField(card, CONTRATOS_FIELD_MAP.modelo_precificacao), 'mensal'),
    areas_direito: areas,
    valor_total:  parseNum(getField(card, CONTRATOS_FIELD_MAP.valor_total)),
    valor_mensal: parseNum(getField(card, CONTRATOS_FIELD_MAP.valor_mensal)),
    data_inicio:  parseDate(getField(card, CONTRATOS_FIELD_MAP.data_inicio)),
    data_fim:     parseDate(getField(card, CONTRATOS_FIELD_MAP.data_fim)),
    status:       norm(STATUS, card.current_phase?.name, 'ativo'),
    rm_status:    'verificar',
    notas:        getField(card, CONTRATOS_FIELD_MAP.notas) || null,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const PIPEFY_TOKEN = process.env.PIPEFY_TOKEN
  if (!PIPEFY_TOKEN) {
    console.error('\n❌ PIPEFY_TOKEN não definido!\n')
    console.log('Como gerar o token:')
    console.log('  Pipefy → Avatar → My account → Personal access tokens → Generate new token\n')
    console.log('Depois rode:')
    console.log('  PIPEFY_TOKEN=seu_token node scripts/migrate-pipefy-api.mjs --list-pipes\n')
    process.exit(1)
  }

  // ── Modo: listar pipes ──────────────────────────────────────────────────────
  if (process.argv.includes('--list-pipes')) {
    console.log('\n🔍 Buscando seus Pipes no Pipefy...\n')
    const me = await listPipes(PIPEFY_TOKEN)
    console.log(`Usuário: ${me.name} (${me.email})\n`)

    for (const org of me.organizations) {
      console.log(`Organização: ${org.name}`)
      console.log('─'.repeat(50))
      for (const pipe of org.pipes) {
        console.log(`\n  📋 Pipe: ${pipe.name}`)
        console.log(`     ID: ${pipe.id}`)
        console.log(`     Fases: ${pipe.phases.map(p => p.name).join(' → ')}`)
        if (pipe.start_form_fields?.length) {
          console.log(`     Campos: ${pipe.start_form_fields.map(f => `"${f.label}"`).join(', ')}`)
        }
      }
    }

    console.log('\n─'.repeat(50))
    console.log('\n✅ Configure os IDs no topo do script e rode novamente sem --list-pipes\n')
    return
  }

  // ── Modo: importar ──────────────────────────────────────────────────────────
  const SUPABASE_URL = process.env.SUPABASE_URL
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('\n❌ SUPABASE_URL ou SUPABASE_SERVICE_KEY não definidos!\n')
    process.exit(1)
  }

  if (!PIPE_LEADS && !PIPE_CLIENTES && !PIPE_CONTRATOS) {
    console.error('\n❌ Nenhum Pipe configurado!\n')
    console.log('1. Rode primeiro para descobrir os IDs:')
    console.log('   PIPEFY_TOKEN=seu_token node scripts/migrate-pipefy-api.mjs --list-pipes\n')
    console.log('2. Configure PIPE_LEADS, PIPE_CLIENTES, PIPE_CONTRATOS no topo do script\n')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false }
  })

  let leadsOk = 0, leadsErr = 0
  let clientesOk = 0, clientesErr = 0
  let contratosOk = 0, contratosErr = 0
  const empresaToClienteId = {}

  console.log('\n🚀 CONSEJ CRM — Migração via API do Pipefy\n')

  // 1. Leads
  if (PIPE_LEADS) {
    console.log('📋 Importando leads...')
    const cards = await fetchAllCards(PIPEFY_TOKEN, PIPE_LEADS)

    for (const card of cards) {
      const lead = cardToLead(card)
      if (!lead) { leadsErr++; continue }

      const { error } = await supabase.from('leads').upsert(lead, { onConflict: 'telefone' })
      if (error) {
        console.error(`   ✗ Lead "${lead.nome}": ${error.message}`)
        leadsErr++
      } else leadsOk++
    }
    console.log(`   ✓ ${leadsOk} inseridos, ${leadsErr} erros\n`)
  }

  // 2. Clientes
  if (PIPE_CLIENTES) {
    console.log('👥 Importando clientes...')
    const cards = await fetchAllCards(PIPEFY_TOKEN, PIPE_CLIENTES)

    for (const card of cards) {
      const cliente = cardToCliente(card)
      if (!cliente) { clientesErr++; continue }

      const { data, error } = await supabase.from('clientes').insert(cliente).select('id, empresa').single()
      if (error) {
        const { data: ex } = await supabase.from('clientes').select('id, empresa').ilike('empresa', cliente.empresa).limit(1).single()
        if (ex) {
          empresaToClienteId[ex.empresa.toLowerCase()] = ex.id
        } else {
          console.error(`   ✗ Cliente "${cliente.nome}": ${error.message}`)
          clientesErr++
        }
      } else if (data) {
        empresaToClienteId[data.empresa.toLowerCase()] = data.id
        clientesOk++
      }
    }
    console.log(`   ✓ ${clientesOk} inseridos, ${clientesErr} erros\n`)
  }

  // 3. Contratos
  if (PIPE_CONTRATOS) {
    console.log('📄 Importando contratos...')
    const cards = await fetchAllCards(PIPEFY_TOKEN, PIPE_CONTRATOS)

    for (const card of cards) {
      const empresaRaw = getField(card, CONTRATOS_FIELD_MAP.empresa_cliente) || card.title
      let clienteId = empresaToClienteId[empresaRaw.toLowerCase()]

      if (!clienteId) {
        const { data: found } = await supabase.from('clientes').select('id').ilike('empresa', empresaRaw).limit(1).single()
        if (found) {
          clienteId = found.id
          empresaToClienteId[empresaRaw.toLowerCase()] = found.id
        } else {
          console.warn(`   ⚠ Cliente "${empresaRaw}" não encontrado — contrato ignorado`)
          contratosErr++
          continue
        }
      }

      const contrato = cardToContrato(card, clienteId)
      if (!contrato) { contratosErr++; continue }

      const { error } = await supabase.from('contratos').insert(contrato)
      if (error) {
        console.error(`   ✗ Contrato de "${empresaRaw}": ${error.message}`)
        contratosErr++
      } else contratosOk++
    }
    console.log(`   ✓ ${contratosOk} inseridos, ${contratosErr} erros\n`)
  }

  // Resumo
  console.log('═══════════════════════════════════')
  console.log('✅ MIGRAÇÃO CONCLUÍDA')
  console.log(`   Leads:     ${leadsOk} inseridos, ${leadsErr} erros`)
  console.log(`   Clientes:  ${clientesOk} inseridos, ${clientesErr} erros`)
  console.log(`   Contratos: ${contratosOk} inseridos, ${contratosErr} erros`)
  console.log('═══════════════════════════════════\n')
}

main().catch(err => {
  console.error('\n❌ Erro:', err.message)
  if (err.message.includes('401') || err.message.includes('Unauthorized')) {
    console.log('Token inválido ou expirado — gere um novo em:')
    console.log('Pipefy → Avatar → My account → Personal access tokens\n')
  }
  process.exit(1)
})
