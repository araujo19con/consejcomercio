/**
 * CONSEJ CRM — Migração do Pipefy
 * ================================
 * Lê 3 CSVs exportados do Pipefy e insere no Supabase.
 *
 * COMO USAR:
 *   1. Exporte seus dados do Pipefy:
 *      Pipe → ⋮ → "Export cards" → CSV
 *
 *   2. Coloque os arquivos em:
 *      scripts/data/leads.csv      (leads ainda em pipeline)
 *      scripts/data/clientes.csv   (clientes ganhos)
 *      scripts/data/contratos.csv  (contratos fechados)
 *
 *   3. Edite a seção "CONFIGURAÇÃO" abaixo com os nomes das
 *      colunas do SEU CSV (veja a primeira linha do arquivo).
 *
 *   4. Pegue a service_role key:
 *      Supabase → Settings → API → service_role (secret)
 *
 *   5. Rode:
 *      SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_KEY=eyJ... node scripts/migrate-pipefy.mjs
 *
 *   Ou crie um arquivo .env.migration com as variáveis e rode:
 *      node -r dotenv/config scripts/migrate-pipefy.mjs dotenv_config_path=.env.migration
 */

import { readFileSync, existsSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, 'data')

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURAÇÃO — edite aqui com os nomes reais das colunas do seu CSV
// ─────────────────────────────────────────────────────────────────────────────

/**
 * LEADS: mapeamento coluna CSV → campo do CRM
 * Deixe null para ignorar o campo ou se não existir no CSV.
 */
const LEADS_MAP = {
  nome:                 'Nome',           // obrigatório
  empresa:              'Empresa',        // obrigatório
  telefone:             'Telefone',       // obrigatório
  email:                'E-mail',
  segmento:             'Segmento',
  origem:               'Origem',
  status:               'Fase',           // nome da fase no Pipefy
  notas:                'Observações',
  investimento_estimado:'Investimento',
  responsavel:          'Responsável',
  estado:               'Estado',         // UF, ex: SP
}

/**
 * Mapa de FASES do Pipefy → status do CRM
 * Ajuste com os nomes exatos das suas fases no Pipefy.
 */
const STAGE_MAP = {
  'Classificação':              'classificacao',
  'Classificacao':              'classificacao',
  'Levantamento de Oportunidade':'levantamento_oportunidade',
  'Levantamento':               'levantamento_oportunidade',
  'Educar o Lead':              'educar_lead',
  'Educar Lead':                'educar_lead',
  'Proposta Comercial':         'proposta_comercial',
  'Proposta':                   'proposta_comercial',
  'Negociação':                 'negociacao',
  'Negociacao':                 'negociacao',
  'Stand By':                   'stand_by',
  'Ganho – Assessoria':         'ganho_assessoria',
  'Ganho Assessoria':           'ganho_assessoria',
  'Ganho – Consultoria':        'ganho_consultoria',
  'Ganho Consultoria':          'ganho_consultoria',
  'Perdido':                    'perdido',
  'Cancelado':                  'cancelado',
}

/**
 * Mapa de SEGMENTOS livres → enum do CRM
 */
const SEGMENTO_MAP = {
  'empresa júnior':    'empresa_junior',
  'empresa junior':    'empresa_junior',
  'ej':                'empresa_junior',
  'empresa sênior':    'empresa_senior',
  'empresa senior':    'empresa_senior',
  'startup':           'startup',
  'arquitetura':       'escritorio_arquitetura',
  'escritório':        'escritorio_arquitetura',
  'design':            'empresa_design',
  'gestão':            'empresa_gestao',
  'gestao':            'empresa_gestao',
  'compliance':        'empresa_gestao',
}

/**
 * Mapa de ORIGENS livres → enum do CRM
 */
const ORIGEM_MAP = {
  'indicação de cliente': 'indicacao_cliente',
  'indicacao de cliente': 'indicacao_cliente',
  'indicação cliente':    'indicacao_cliente',
  'indicação de parceiro':'indicacao_parceiro',
  'indicacao de parceiro':'indicacao_parceiro',
  'evento':               'evento',
  'workshop':             'evento',
  'redes sociais':        'redes_sociais',
  'instagram':            'redes_sociais',
  'linkedin':             'redes_sociais',
  'site':                 'site',
  'inbound':              'site',
  'mej':                  'mej',
  'rede mej':             'mej',
}

/**
 * CLIENTES: mapeamento coluna CSV → campo do CRM
 */
const CLIENTES_MAP = {
  nome:     'Nome',       // obrigatório
  empresa:  'Empresa',    // obrigatório (usado para vincular contratos)
  telefone: 'Telefone',
  email:    'E-mail',
  segmento: 'Segmento',
  status:   'Status',     // ativo | em_renovacao | encerrado
  notas:    'Observações',
  estado:   'Estado',
}

/**
 * CONTRATOS: mapeamento coluna CSV → campo do CRM
 */
const CONTRATOS_MAP = {
  empresa_cliente:      'Empresa',        // usado para vincular ao cliente
  tipo:                 'Tipo',           // assessoria | consultoria | resgate
  modelo_precificacao:  'Modelo',         // mensal | por_demanda | hibrido
  areas_direito:        'Áreas',          // separado por vírgula: "civil, empresarial"
  valor_total:          'Valor Total',
  valor_mensal:         'Valor Mensal',
  data_inicio:          'Data Início',
  data_fim:             'Data Fim',
  status:               'Status',         // ativo | encerrado | suspenso
  notas:                'Observações',
}

/**
 * Mapa de tipos de contrato livres → enum do CRM
 */
const TIPO_CONTRATO_MAP = {
  'assessoria':      'assessoria',
  'assessoria jurídica': 'assessoria',
  'consultoria':     'consultoria',
  'consultoria jurídica': 'consultoria',
  'resgate':         'resgate',
  'por resgate':     'resgate',
}

// ─────────────────────────────────────────────────────────────────────────────
// PARSER CSV
// ─────────────────────────────────────────────────────────────────────────────

function parseCSV(filePath) {
  const content = readFileSync(filePath, 'utf-8').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = content.split('\n').filter(l => l.trim())
  if (lines.length < 2) return []

  const headers = parseCSVLine(lines[0])
  const rows = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    if (values.every(v => !v.trim())) continue
    const row = {}
    headers.forEach((h, idx) => {
      row[h.trim()] = (values[idx] ?? '').trim()
    })
    rows.push(row)
  }

  return rows
}

function parseCSVLine(line) {
  const result = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  result.push(current)
  return result
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function get(row, csvColumn) {
  if (!csvColumn) return ''
  return (row[csvColumn] ?? '').trim()
}

function normalizeEnum(value, map, fallback) {
  if (!value) return fallback
  const lower = value.toLowerCase().trim()
  return map[lower] || map[value] || fallback
}

function parseDate(str) {
  if (!str) return null
  // Tenta formatos: dd/mm/yyyy, yyyy-mm-dd, mm/dd/yyyy
  const parts = str.split(/[\/\-]/)
  if (parts.length !== 3) return null
  if (parts[0].length === 4) return str // já é yyyy-mm-dd
  if (parts[2].length === 4) {
    // dd/mm/yyyy
    return `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`
  }
  return null
}

function parseNumber(str) {
  if (!str) return null
  // Remove R$, pontos de milhar, substitui vírgula decimal
  const cleaned = str.replace(/R\$\s?/g, '').replace(/\./g, '').replace(',', '.').trim()
  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}

function parseArray(str) {
  if (!str) return []
  return str.split(/[,;]/).map(s => s.trim().toLowerCase()).filter(Boolean)
}

// ─────────────────────────────────────────────────────────────────────────────
// TRANSFORMADORES
// ─────────────────────────────────────────────────────────────────────────────

function transformLead(row) {
  const nome    = get(row, LEADS_MAP.nome)
  const empresa = get(row, LEADS_MAP.empresa)
  const telefone = get(row, LEADS_MAP.telefone)

  if (!nome || !empresa) return null

  const rawStatus = get(row, LEADS_MAP.status)
  const status = STAGE_MAP[rawStatus] || 'classificacao'

  const rawSegmento = get(row, LEADS_MAP.segmento)
  const segmento = normalizeEnum(rawSegmento, SEGMENTO_MAP, 'outro')

  const rawOrigem = get(row, LEADS_MAP.origem)
  const origem = normalizeEnum(rawOrigem, ORIGEM_MAP, 'outro')

  return {
    nome,
    empresa,
    telefone: telefone || 'Não informado',
    email: get(row, LEADS_MAP.email) || null,
    segmento,
    origem,
    status,
    notas: get(row, LEADS_MAP.notas) || null,
    investimento_estimado: get(row, LEADS_MAP.investimento_estimado) || null,
    responsavel: get(row, LEADS_MAP.responsavel) || null,
    estado: get(row, LEADS_MAP.estado) || null,
    servicos_interesse: [],
  }
}

function transformCliente(row) {
  const nome    = get(row, CLIENTES_MAP.nome)
  const empresa = get(row, CLIENTES_MAP.empresa)

  if (!nome || !empresa) return null

  const rawSegmento = get(row, CLIENTES_MAP.segmento)
  const segmento = normalizeEnum(rawSegmento, SEGMENTO_MAP, 'outro')

  const rawStatus = get(row, CLIENTES_MAP.status)
  const STATUS_CLIENTE = { 'ativo': 'ativo', 'em renovação': 'em_renovacao', 'em renovacao': 'em_renovacao', 'encerrado': 'encerrado' }
  const status = normalizeEnum(rawStatus, STATUS_CLIENTE, 'ativo')

  return {
    nome,
    empresa,
    segmento,
    status,
    telefone: get(row, CLIENTES_MAP.telefone) || null,
    email: get(row, CLIENTES_MAP.email) || null,
    notas: get(row, CLIENTES_MAP.notas) || null,
    estado: get(row, CLIENTES_MAP.estado) || null,
  }
}

function transformContrato(row, clienteId) {
  if (!clienteId) return null

  const rawTipo = get(row, CONTRATOS_MAP.tipo)
  const tipo = normalizeEnum(rawTipo, TIPO_CONTRATO_MAP, 'assessoria')

  const rawModelo = get(row, CONTRATOS_MAP.modelo_precificacao)
  const MODELO_MAP = { 'mensal': 'mensal', 'por demanda': 'por_demanda', 'híbrido': 'hibrido', 'hibrido': 'hibrido' }
  const modelo_precificacao = normalizeEnum(rawModelo, MODELO_MAP, 'mensal')

  const rawAreas = get(row, CONTRATOS_MAP.areas_direito)
  const areas_direito = parseArray(rawAreas)

  const rawStatus = get(row, CONTRATOS_MAP.status)
  const STATUS_CONTRATO = { 'ativo': 'ativo', 'encerrado': 'encerrado', 'suspenso': 'suspenso' }
  const status = normalizeEnum(rawStatus, STATUS_CONTRATO, 'ativo')

  return {
    cliente_id: clienteId,
    tipo,
    modelo_precificacao,
    areas_direito: areas_direito.length > 0 ? areas_direito : ['empresarial'],
    valor_total: parseNumber(get(row, CONTRATOS_MAP.valor_total)),
    valor_mensal: parseNumber(get(row, CONTRATOS_MAP.valor_mensal)),
    data_inicio: parseDate(get(row, CONTRATOS_MAP.data_inicio)),
    data_fim: parseDate(get(row, CONTRATOS_MAP.data_fim)),
    status,
    rm_status: 'verificar',
    notas: get(row, CONTRATOS_MAP.notas) || null,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  // Verificar variáveis de ambiente
  const SUPABASE_URL = process.env.SUPABASE_URL
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('\n❌ Variáveis de ambiente não definidas!\n')
    console.log('Execute assim:')
    console.log('  SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_KEY=eyJ... node scripts/migrate-pipefy.mjs\n')
    console.log('Ou crie .env.migration com:')
    console.log('  SUPABASE_URL=https://xxx.supabase.co')
    console.log('  SUPABASE_SERVICE_KEY=eyJ...\n')
    console.log('E rode:')
    console.log('  node -r dotenv/config scripts/migrate-pipefy.mjs dotenv_config_path=.env.migration\n')
    process.exit(1)
  }

  // Verificar se há CSVs
  const leadsFile    = join(DATA_DIR, 'leads.csv')
  const clientesFile = join(DATA_DIR, 'clientes.csv')
  const contratosFile = join(DATA_DIR, 'contratos.csv')

  const hasLeads    = existsSync(leadsFile)
  const hasClientes = existsSync(clientesFile)
  const hasContratos = existsSync(contratosFile)

  if (!hasLeads && !hasClientes && !hasContratos) {
    console.log('\n📂 Nenhum CSV encontrado em scripts/data/\n')
    console.log('Coloque os arquivos exportados do Pipefy:')
    console.log('  scripts/data/leads.csv      → leads do pipeline')
    console.log('  scripts/data/clientes.csv   → clientes ganhos')
    console.log('  scripts/data/contratos.csv  → contratos\n')
    console.log('Como exportar do Pipefy:')
    console.log('  1. Abra o Pipe')
    console.log('  2. Clique em ⋮ (menu)')
    console.log('  3. "Export cards" → CSV\n')
    process.exit(0)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false }
  })

  let leadsOk = 0, leadsErr = 0
  let clientesOk = 0, clientesErr = 0
  let contratosOk = 0, contratosErr = 0
  const empresaToClienteId = {} // empresa (lower) → uuid do cliente inserido

  console.log('\n🚀 CONSEJ CRM — Migração do Pipefy\n')

  // ── 1. LEADS ──────────────────────────────────────────────────────────────
  if (hasLeads) {
    console.log('📋 Importando leads...')
    const rows = parseCSV(leadsFile)
    console.log(`   ${rows.length} linhas encontradas`)

    for (const row of rows) {
      const lead = transformLead(row)
      if (!lead) {
        console.warn('   ⚠ Linha ignorada (nome/empresa vazio):', JSON.stringify(row).slice(0, 80))
        leadsErr++
        continue
      }

      const { error } = await supabase
        .from('leads')
        .upsert(lead, { onConflict: 'telefone', ignoreDuplicates: false })

      if (error) {
        console.error(`   ✗ Lead "${lead.nome}": ${error.message}`)
        leadsErr++
      } else {
        leadsOk++
      }
    }
    console.log(`   ✓ ${leadsOk} inseridos, ${leadsErr} erros\n`)
  }

  // ── 2. CLIENTES ───────────────────────────────────────────────────────────
  if (hasClientes) {
    console.log('👥 Importando clientes...')
    const rows = parseCSV(clientesFile)
    console.log(`   ${rows.length} linhas encontradas`)

    for (const row of rows) {
      const cliente = transformCliente(row)
      if (!cliente) {
        console.warn('   ⚠ Linha ignorada (nome/empresa vazio)')
        clientesErr++
        continue
      }

      const { data, error } = await supabase
        .from('clientes')
        .insert(cliente)
        .select('id, empresa')
        .single()

      if (error) {
        // Tenta buscar se já existe (para vincular contratos)
        const { data: existing } = await supabase
          .from('clientes')
          .select('id, empresa')
          .ilike('empresa', cliente.empresa)
          .limit(1)
          .single()

        if (existing) {
          empresaToClienteId[cliente.empresa.toLowerCase()] = existing.id
          console.warn(`   ~ Cliente "${cliente.empresa}" já existe — usando existente`)
        } else {
          console.error(`   ✗ Cliente "${cliente.nome}": ${error.message}`)
          clientesErr++
        }
      } else {
        empresaToClienteId[data.empresa.toLowerCase()] = data.id
        clientesOk++
      }
    }
    console.log(`   ✓ ${clientesOk} inseridos, ${clientesErr} erros\n`)
  }

  // ── 3. CONTRATOS ──────────────────────────────────────────────────────────
  if (hasContratos) {
    console.log('📄 Importando contratos...')
    const rows = parseCSV(contratosFile)
    console.log(`   ${rows.length} linhas encontradas`)

    for (const row of rows) {
      const empresaRaw = get(row, CONTRATOS_MAP.empresa_cliente)
      const clienteId = empresaToClienteId[empresaRaw.toLowerCase()]

      if (!clienteId) {
        // Tenta buscar no banco
        const { data: found } = await supabase
          .from('clientes')
          .select('id')
          .ilike('empresa', empresaRaw)
          .limit(1)
          .single()

        if (found) {
          empresaToClienteId[empresaRaw.toLowerCase()] = found.id
        } else {
          console.warn(`   ⚠ Cliente não encontrado para empresa "${empresaRaw}" — contrato ignorado`)
          contratosErr++
          continue
        }
      }

      const contrato = transformContrato(row, empresaToClienteId[empresaRaw.toLowerCase()])
      if (!contrato) { contratosErr++; continue }

      const { error } = await supabase.from('contratos').insert(contrato)

      if (error) {
        console.error(`   ✗ Contrato de "${empresaRaw}": ${error.message}`)
        contratosErr++
      } else {
        contratosOk++
      }
    }
    console.log(`   ✓ ${contratosOk} inseridos, ${contratosErr} erros\n`)
  }

  // ── RESUMO ────────────────────────────────────────────────────────────────
  console.log('═══════════════════════════════════')
  console.log('✅ MIGRAÇÃO CONCLUÍDA')
  console.log(`   Leads:     ${leadsOk} inseridos, ${leadsErr} erros`)
  console.log(`   Clientes:  ${clientesOk} inseridos, ${clientesErr} erros`)
  console.log(`   Contratos: ${contratosOk} inseridos, ${contratosErr} erros`)
  console.log('═══════════════════════════════════\n')
  console.log('Acesse o CRM para verificar os dados:')
  console.log('  /leads     → kanban com leads importados')
  console.log('  /clientes  → tabela de clientes')
  console.log('  /contratos → tabela de contratos\n')
}

main().catch(err => {
  console.error('\n❌ Erro inesperado:', err.message)
  process.exit(1)
})
